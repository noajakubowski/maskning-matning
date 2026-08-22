#!/usr/bin/env python3
"""Granska markdown-dokument mot innehållskrav utan att lita på rå filtext.

Tidigare granskningar sökte exakta strängar i markdown-källan. Radbrytningar,
fetstil, kodmarkering och kolumnjustering gjorde att frasen fanns i det
renderade innehållet men inte som en sammanhängande källsträng — och kontrollen
föll på form i stället för på sak.

Det här skriptet normaliserar både dokument och sökfras innan jämförelse, så
att granskning testar vad läsaren ser, inte hur filen är radbruten.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def normalisera(text: str) -> str:
    """Gör markdown-text jämförbar oberoende av formatering."""
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("`", "")
    text = re.sub(r"[*_]", "", text)
    text = text.replace("\u00a0", " ")
    text = text.replace("\u2007", " ")
    text = text.replace("\u202f", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip().casefold()


def innehaller(text: str, sokfras: str) -> bool:
    return normalisera(sokfras) in normalisera(text)


def skriv_kontroll(
    etikett: str,
    sokfras: str,
    dokument: str,
    ska_finns: bool,
) -> bool:
    funnen = innehaller(dokument, sokfras)
    ok = funnen == ska_finns
    if ok:
        status = "OK"
    else:
        status = "BRIST"
    riktning = "krävs" if ska_finns else "förbjuden"
    print(f"{status}  {etikett} ({riktning}): {sokfras!r}")
    return ok


def kor_sjalvtest() -> int:
    fall = [
        (
            "fetstil delar strängen",
            "bygger på studier, **inte** svenska myndighetsskanningar",
            "inte svenska myndighetsskanningar",
            True,
        ),
        (
            "radbrytning mitt i frasen",
            "antal och som antal per 1000\ntecken text",
            "per 1000 tecken",
            True,
        ),
        (
            "kolumnjustering",
            "n = 400     halvbredd  ±2,94 pe",
            "halvbredd ±2,94 pe",
            True,
        ),
        (
            "kodmarkering runt fras",
            "regeln heter `union per typ` och gäller",
            "union per typ",
            True,
        ),
        (
            "negativt kontrollfall",
            "fördelningen bygger på engelska studier",
            "svenska myndighetsskanningar",
            False,
        ),
    ]

    alla_ok = True
    print("Självtest granska-dokument.py")
    for namn, text, sokfras, ska_finns in fall:
        ok = skriv_kontroll(namn, sokfras, text, ska_finns)
        alla_ok = alla_ok and ok

    if alla_ok:
        print("Självtest: alla fall OK")
        return 0

    print("Självtest: minst ett fall misslyckades", file=sys.stderr)
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Granska markdown-dokument mot innehållskrav."
    )
    parser.add_argument(
        "fil",
        nargs="?",
        help="Markdown-fil att granska.",
    )
    parser.add_argument(
        "--kraver",
        action="append",
        default=[],
        metavar="FRAS",
        help="Fras som måste finnas (kan upprepas).",
    )
    parser.add_argument(
        "--forbjuder",
        action="append",
        default=[],
        metavar="FRAS",
        help="Fras som inte får finnas (kan upprepas).",
    )
    parser.add_argument(
        "--sjalvtest",
        action="store_true",
        help="Kör inbyggt självtest utan filargument.",
    )

    args = parser.parse_args(argv)

    if args.sjalvtest:
        return kor_sjalvtest()

    if not args.fil:
        parser.error("FIL krävs om --sjalvtest inte anges.")

    dokument = Path(args.fil).read_text(encoding="utf-8")
    alla_ok = True

    for i, fras in enumerate(args.kraver, start=1):
        ok = skriv_kontroll(f"krav {i}", fras, dokument, ska_finns=True)
        alla_ok = alla_ok and ok

    for i, fras in enumerate(args.forbjuder, start=1):
        ok = skriv_kontroll(f"förbud {i}", fras, dokument, ska_finns=False)
        alla_ok = alla_ok and ok

    if not args.kraver and not args.forbjuder:
        print("Varning: inga krav eller förbud angivna.", file=sys.stderr)

    if alla_ok:
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
