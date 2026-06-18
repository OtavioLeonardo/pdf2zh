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

#pdf2zh-title([Table 6: Gender differences in composers’ family background and teacher access])

Table 6: Gender differences in composers’ family background and teacher access

#figure(image("assets/images/758ae48b2aad8c191eca323ca2aebce262e643924f7fee6cd83f6783757c5586.jpg", width: 100%), caption: [Table 6: Gender differences in composers’ family background and teacher access])

Notes: Standard errors are clustered at the country level. Significance levels: $"***" p < 0.01; "**" p < 0.05; "*" p < 0.1$ .

musician-father. The coefficient estimates indicate that while male and female composers were equally likely to have musician-fathers, female composers were a statistically significant 6 percentage points more likely to have musician-mothers than male composers. Given that only 3 percent of male composers had composer-mother, female composers were three times more likely to have a musician-mother than male composers. Musician-mothers may therefore have been especially important in nurturing female musical talent.

We next turn to the consequences of musician-parents for composer prominence. To do this, we estimate the following regression:

$l n("word count") _(i) = beta_(0) + beta_(1) ("female")_(i) + beta_(2) ("mother musician") +$

$beta_(3) ("father musician")_(i) + beta_(4) ("female")_(i) times ("mother musician")_(i) + "(3)"$

$beta_(5) ("female")_(i) times ("father musician")_(i) + gamma_(i) + delta_(t) + epsilon_(i)$

The outcome variable in this equation is the natural logarithm of the word count of composer $i ^(prime) s$ main description; $"female" _(i)$ is a binary indicator equal to one if composer i is female; mother musiciani and f ather musiciani are binary indicators equal to one if composer i has a musician-mother or musician-father, and the remaining variables are defined as before. If musician-parents are beneficial for a composer’s future prominence, $"beta"_(2)$ or $"beta"_(3)$ should be positive

