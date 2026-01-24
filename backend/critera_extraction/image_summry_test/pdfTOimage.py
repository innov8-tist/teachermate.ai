from pdf2image import convert_from_path

pages = convert_from_path("IA1 MSS ANSWER SCHEME.pdf", dpi=300)

pages[6].save("page_1.png", "PNG")