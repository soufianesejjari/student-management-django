"""Shared academy branding for printable PDF documents."""
from pathlib import Path

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm


PRIMARY_RED = colors.HexColor('#C51F26')
MUTED_TEXT = colors.HexColor('#626262')
LIGHT_RED = colors.HexColor('#FCEDEE')


def academy_identity(academy):
    return {
        'name': academy.school_name or 'The Musical Academy',
        'phone': academy.school_phone or '',
        'email': academy.school_email or '',
        'address': academy.school_address or '',
    }


def academy_logo_path():
    path = Path(settings.BASE_DIR) / 'media' / 'logo.png'
    return path if path.exists() else None


def draw_academy_header(pdf, identity, logo_path=None):
    """Draw the exact same branded header on every academy document page."""
    width, height = A4
    left = 18 * mm
    right = width - left
    logo_path = logo_path or academy_logo_path()

    pdf.saveState()
    if logo_path:
        pdf.drawImage(
            str(logo_path),
            left,
            height - 28 * mm,
            width=48 * mm,
            height=19 * mm,
            preserveAspectRatio=True,
            anchor='w',
            mask='auto',
        )
    else:
        pdf.setFillColor(PRIMARY_RED)
        pdf.setFont('Helvetica-Bold', 15)
        pdf.drawString(left, height - 19 * mm, identity['name'].upper())

    pdf.setFillColor(PRIMARY_RED)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawRightString(right, height - 13 * mm, identity['name'].upper())
    pdf.setFillColor(MUTED_TEXT)
    pdf.setFont('Helvetica', 7.5)
    pdf.drawRightString(right, height - 18.5 * mm, identity['address'])
    contact = '  |  '.join(filter(None, [identity['phone'], identity['email']]))
    pdf.drawRightString(right, height - 23.5 * mm, contact)

    pdf.setStrokeColor(PRIMARY_RED)
    pdf.setLineWidth(1.4)
    pdf.line(left, height - 32 * mm, right, height - 32 * mm)
    pdf.restoreState()


def draw_academy_footer(pdf, identity, page_label=None):
    width, _ = A4
    left = 18 * mm
    right = width - left

    pdf.saveState()
    pdf.setStrokeColor(PRIMARY_RED)
    pdf.setLineWidth(0.8)
    pdf.line(left, 19 * mm, right, 19 * mm)
    pdf.setFillColor(MUTED_TEXT)
    pdf.setFont('Helvetica', 7)
    pdf.drawString(left, 13 * mm, identity['name'])
    contact = '  |  '.join(filter(None, [identity['phone'], identity['email']]))
    pdf.drawCentredString(width / 2, 9 * mm, contact)
    if page_label:
        pdf.drawRightString(right, 13 * mm, f'Page {page_label}')
    pdf.restoreState()
