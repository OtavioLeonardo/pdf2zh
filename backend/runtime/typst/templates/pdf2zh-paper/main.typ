#set page(
  paper: "a4",
  margin: (top: 2.8cm, bottom: 2.8cm, left: 2.5cm, right: 2.5cm),
  number-align: center,
)

#set text(
  lang: "zh",
  font: "Source Han Serif SC",
  fallback: true,
  size: 10.5pt,
)

#set par(
  justify: true,
  first-line-indent: 2em,
  leading: 0.75em,
)

#set heading(numbering: "1.1")
#set table(stroke: 0.4pt)
#show figure: set block(breakable: true)
#show table: set block(breakable: true)
#show raw: set text(font: "Noto Sans Mono", size: 9pt)
#set math.equation(numbering: "(1)")

#let pdf2zh-title(content) = block(above: 0pt, below: 1.2em)[
  #align(center)[
    #set text(font: "Source Han Serif SC", size: 18pt, weight: "bold")
    #content
  ]
]

#let pdf2zh-abstract(content) = block(above: 0.8em, below: 1.4em)[
  #set text(font: "Source Han Sans SC", size: 10pt)
  *摘要*\
  #content
]

#let pdf2zh-doc(title: none, abstract: none, body: none) = {
  if title != none and title != [] {
    pdf2zh-title(title)
  }

  if abstract != none and abstract != [] {
    pdf2zh-abstract(abstract)
  }

  if body != none {
    body
  }
}

{{PDF2ZH_DOCUMENT}}
