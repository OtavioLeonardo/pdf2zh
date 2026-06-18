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

#pdf2zh-title([“男人几乎是普遍准则”：芬兰古典音乐界性别不平等与白人中心主义的案例研究])

= “男人几乎是普遍准则”：芬兰古典音乐界性别不平等与白人中心主义的案例研究

Ramstedt, Anna M W

2022-06-28

Routledge http://hdl.handle.net/10138/356015

Ramstedt, A M W 2022, '“男人几乎是普遍准则”：芬兰古典音乐界性别不平等与白人中心主义的案例研究', NORA——北欧女性主义与性别研究期刊, 第31卷, 第1期, 页91-107. https://doi.org /10.1080/08038740.2022.2088611

下载自赫尔辛基大学机构库 Helda。https://helda.helsinki.fi

这是原文的电子重印本。

本重印本可能在页码和排版细节上与原文不同。

请引用原始版本。

= “男人几乎是普遍准则”——芬兰古典音乐界性别不平等与白人中心主义的案例研究

Anna Ramstedt

引用本文：Anna Ramstedt (2022)：“男人几乎是普遍准则”——芬兰古典音乐界性别不平等与白人中心主义的案例研究，NORA——北欧女性主义与性别研究期刊，DOI: 10.1080/08038740.2022.2088611

本文链接：https://doi.org/10.1080/08038740.2022.2088611

#figure(image("assets/images/421aee8f36aa8712d31856df2fa6f5cd9973fcc674a8d475f218fa59b9c4ab16.jpg", width: 100%), caption: [image])

© 2022 作者。由Informa UK Limited出版，作为泰勒与弗朗西斯集团旗下品牌。

#figure(image("assets/images/1a79dd2f1f649d141e00cb1cc1587d463bc7adead0347700270137516df4c676.jpg", width: 100%), caption: [image])

在线出版日期：2022年6月28日。

#figure(image("assets/images/152cc74c1ab1425e61608dcf29740d32fc68bfd063f88f577d830ffa22627e37.jpg", width: 100%), caption: [image])

向本刊投稿

#figure(image("assets/images/e0d545da8d10479c4da6069d6346f0a4e7f1cd3d3005250f3767f270777ee2ea.jpg", width: 100%), caption: [image])

文章浏览量：262

#figure(image("assets/images/373e7a11b6ab7a448f5b9d621073916f03ff2869c33feab35907ef4df488b1e9.jpg", width: 100%), caption: [image])

查看相关文章

#figure(image("assets/images/f538879cdbde2b4b04e62c8bc128c2ee8e7c33df7ae13f91aa6965a34afb4bc3.jpg", width: 100%), caption: [image])

查看Crossmark数据 开放获取

查看更新

= “A Man Is Practically the General Norm” – A Case Study of Gender Inequality and Whiteness in the Classical Music Scene in Finland

Anna Ramstedt

Doctoral Programme in Philosophy, Arts, and Society, University of Helsinki, Helsinki, Finland

== 摘要

在本文中，我展示了普遍接受的表演实践形式以及由通常被理想化的表演者进行的表演如何揭示芬兰古典音乐文化中盛行的性别化与种族化想象。本文的研究材料通过对十四名年龄在25至45岁之间的白人顺性别女性芬兰职业古典钢琴家、小提琴家、中提琴家和大提琴家的主题深度访谈收集。我探讨了由广受赞誉的表演者维护的表演理想和传统上被接受的作品演绎方式如何传达性别化与种族化建构。此外，我探讨了与理想化表演者和表演理想相关的性别化与种族化建构如何塑造、交织并影响芬兰女性音乐家的具身体验。我认为，被广泛视为典型表演者的群体构成了一个表演者正典，他们通过表演欧洲中心、性别化与种族化社会想象的肉体行为来重申和维护理想化美学，从而在维持古典音乐的压迫性现状中发挥关键作用。这些社会想象部分地塑造了音乐家的具身主体性，并影响他们的自尊以及他们对性别化与种族化身体及其社会价值的理解。

== 文章历史

收稿日期：2021年10月21日

接受日期：2022年6月6日

== 关键词

西方古典音乐；白人中心主义；性别不平等；表演实践；女性主义音乐研究；社会想象

== 引言

芬兰常被描绘为“世界上促进性别平等的领先国家之一”（芬兰社会事务与卫生部，未注明出版年份）。社会平等被视为芬兰福利国家的基石，芬兰连续多年在欧盟性别平等指数中排名第四（芬兰政府，2021；欧洲性别平等研究所，2020）。社会平等的目标也被认为体现在芬兰音乐教育体系的教学方式中（Aarnio，2017）。芬兰音乐教育体系享有“世界上最好的音乐教育体系之一”的声誉，涵盖了大量由公共资助的音乐学院，旨在“让所有社会阶层和背景的儿童都有机会学习音乐”（Aarnio，2017；Kubik，2017；Mollet，2020）。音乐教育体系，尤其是西方古典音乐领域的教育，被认为是拥有“卓越秘诀”的体系（Kubik，2017）。该系统也被视为芬兰拥有大量国际知名古典音乐作曲家、指挥家和器乐演奏家的主要原因（Aarnio，2017；Kubik，2017；Mollet，2020）。尽管成功的芬兰音乐教育被视为平等的象征，但关于芬兰古典音乐文化的统计数据却显示出令人担忧的性别化和种族化不平等（Kvist，2020；Sirén，2019）。在本文中，我讨论了芬兰古典音乐文化和教育的社会建构中隐含的性别化和种族化规范。我特别展示了在音乐教育机构中习得的性别化和种族化信念与表征如何塑造芬兰职业女性音乐家对自身及他人的体验。

2010年至2019年间，芬兰古典音乐管弦乐音乐会中94%由男性指挥（Kvist，2020）。此外，2019年芬兰管弦乐团演奏的音乐中高达94%主要由白人男性创作（Sirén，2019）。尽管芬兰音乐机构中70%接受高级学习的学生是女性（芬兰音乐机构学会，2019），但在芬兰古典音乐专业领域的各个权威职位上，白人男性无疑占据主导地位。同时，与白人规范性相对照，被种族化为非白人的音乐家和作曲家在统计数据中的缺失也令人震惊。关于芬兰古典音乐文化的统计数据表明，北欧平等作为一种包罗万象的现象是一个神话。

白人规范性（参见Ahmed，2007；Dyer，\[1997\]，2002；Seikkula，2019）更广泛地与北欧政治和历史例外论的神话相联系。在芬兰以及其它北欧国家，由于这些国家相对于欧洲帝国主义的边缘地位，关于种族主义和特权的讨论一直被视为无关紧要（Lofstdóttir & Jensen，2012，第2页；Rastas，2012，第90页；Keskinen，2021，第69-70页；另见Keskinen，Tuori，Irni，& Diana，2009；Seikkula，2019）。然而，正如批判性种族研究者Keskinen（2021，第71页）所指出的，殖民主义既不受限于时间也不受限于地点。例如，音乐研究者Taru Leppänen（2015，第20页）认为，尽管芬兰的种族、民族和种族主义传统上主要根据现有的、普遍认可的社会文化规范、价值观和结构（如与少数群体、歧视和移民相关的语境）进行研究，但种族和白人在不太显而易见的语境中（如西方古典音乐）也可能具有重要意义。

事实上，关于芬兰古典音乐曲目、表演者和指挥的统计数据证实了古典音乐的规范性实践，这些实践主要依赖于欧洲白人男性作曲家“天才”的浪漫主义神话（参见Battersby，1989；Dahlhaus，\[1989\]，1990；McClary，\[1991\]，2002；Goehr，1992；Tiainen，2005；Moisala，2006；Bonds，2014；Torvinen，2019；Jean-Francois，2020）。正如音乐史学家与性别研究学者Citron（\[1993\]，2000，第213页；另见Griffiths，2019）所指出的，古典音乐实践持续强调“中上层阶级白人男性的中心地位以及女性的从属地位”，同时边缘化黑人、原住民和有色人种，尽管研究文献中记录了大量的女性以及被种族化为非白人的作曲家和音乐家（参见Neuls-Bates，1982；Bowers & Tick，1987；De Lerma，1990；Pendle \[1991\]，2001；Ellis，1997；Floyd，1999；Herbert，2000；Yoshihara，2007；André, Bryan, & Saylor，2012；Lim，2012；Cirio，2015；Thurman，2012，2019，2021；Smith，2016；André，2018；Koivisto，2019；Välimäki & Koivisto-Kaasik，2019；Ledford，2020；BBC，2020）。与这一思路相呼应，性别、媒体与文化研究者Scharff（2018a，第2页）指出，关于女性古典音乐家，“我们了解得相对较少”。

近年来，西方古典音乐文化中普遍存在的社会等级制度对边缘化和少数族裔音乐家的影响越来越受到关注（Yang，2007；Yoshihara，2007；Hung，2009；Tan，2013；Leppänen，2015；Scharff，2018a，2018b；Bull，2018，2019；Kowalcyk，2019；Thurman，2021）。这项定性研究通过关注芬兰职业女性古典音乐家的经历，为现有研究做出了贡献。正如上述统计数据所示，她们在主要由白人男性主导的古典音乐界中仍然是少数群体。本文的研究材料是通过对14名年龄在25至45岁之间、自我认同为女性的芬兰职业古典钢琴家、小提琴家、中提琴家和大提琴家进行主题深度访谈收集的。根据统计数据，种族和白人规范性与性别等级制度密切相关，表明性别化和种族化建构是相互交织的，因此应该作为交叉性进行分析。这些揭示性别化和种族化不平等的统计数据基于古典音乐表演的信息，这些表演通过肉体表演行为设定了古典音乐文化的标准和理想。因此，研究职业音乐家如何理解和体验与古典音乐表演相关的理想，有助于理解芬兰古典音乐文化中潜在的不平等，并理解这种不平等对职业女性音乐家及其工作的影响。因此，我提出以下问题：性别化和种族化建构如何通过广受赞誉的表演者所维护的表演理想以及传统上被接受的音乐作品表演方式得以传达？此外，性别化和种族化建构如何与理想化的表演者和表演理想相关联，塑造、交织并影响身体与心灵的相互关系——芬兰女性音乐家的具身主体性体验（Huneman & Wolfe，2017，第242页）。

== 通过社会想象理解性别化与种族化建构

为了理解本研究受访者所认可的古典音乐表演理想和理想化表演者形象如何反映并促成种族化的性别社会建构，我转向女性主义哲学家莫伊拉·盖滕斯（Moira Gatens，\[1996\], 2003; 2004; Churcher & Gatens, 2019）以及女性主义作家、研究者和社会活动家萨拉·艾哈迈德（Sara Ahmed，2007）的研究。在《想象的身体：伦理、权力与具身性》\[1996\], 2003一书中，盖滕斯讨论了性别化的身体如何占据社会和政治空间，以及人类身体如何在文化中被再现，并提出了社会想象的概念。盖滕斯（\[1996\], 2003, 第viii页）指出，她并非提供一种关于“想象”的理论，也不将想象的身体理解为“仅仅是主观想象、幻想或民俗的产物”。相反，她（\[1996\], 2003, 第viii页）以松散但技术性的意义使用“社会想象”这一概念，指代那些“有助于建构各种形式主体性的图像、符号、隐喻和再现”。尽管盖滕斯（2004, 第282页）坚持认为复数形式的社会想象包括“宗教的、政治的、经济的、性的、种族的、民族的、道德的和国家的与国际的想象”，但她的著作较少关注种族等级制度。

因此，为了理解种族化的想象，我转向艾哈迈德（2007, 第154页）对种族的理解，即“一个关于什么触手可及、什么能够被感知并用于‘做事’的问题”，用以讨论古典音乐表演的理想化和期待性社会想象如何揭示种族化底色。正如艾哈迈德（2007, 第150页）探索白人中心主义如何是“真实的、物质的且被活出来的”，我也追问社会想象过去和现在如何被我的研究参与者活出来并具身化。艾哈迈德（2007, 第153页）指出，“种族不仅打断\[一个身体图式或空间\]，而且结构了其运作模式”，使其超越了附着在身体上的意义，以及那些被认为对某些身体可及而对其他身体被否定的特权和空间（Keskinen, Seikkula, Mkwesha 2021, 第60页）。盖滕斯（\[1996\], 2003, 第x页）将社会想象讨论为意识的“背景”，类似于“惯习”（habitus），这与艾哈迈德（2007, 第149页）关于“白人中心主义作为一种习惯，甚至是一种坏习惯，成为社会行动的背景”的论述相似。换言之，两位研究者都在追问“周围”的是什么（Ahmed, 2007, 第151页）。

尽管古典音乐文化中规范性和支配性的社会想象可能看似固定且永久，但在本文的一些部分，我也展示这些想象实际上是不稳定且脆弱的：处于不断涌现的状态。我偶尔会运用女性主义研究者蒂亚宁（Tiainen）、莱潘宁（Leppänen）、孔图里（Kontturi）和梅赫拉比（Mehrabi）（2020）提出的“中间”（the middle）概念来做到这一点。他们的方法旨在超越交叉性理论与新物质主义之间相互对立的关系。蒂亚宁等人（2020, 第1页）写道，倾向过程本体论以及物质在现实构成中的角色的女性主义学者批评交叉性方法将身份范畴重复为静态位置，并过度强调主体的话语定位，同时忽视了物质条件、超越人类的关系以及身份范畴的情境性。反过来，新物质主义据蒂亚宁等人（2020, 第1–2页）所述，受到女性主义理论家的批评，认为其过度声明物质的本体论优先性，并预设了一种“最终仍然以白人殖民男性为模型的普遍人类存在”（另见Sullivan, 2012; Tompkins, 2016）。蒂亚宁等人（2020）提出“中间”的概念，旨在“不仅将交叉性差异视为结构、系统和已经存在的存在可能性的问题，而且将其视为跨越社会、物质、话语、人类和超越人类活动领域的开放性关系性”（Tiainen et al., 2020, 第9页）。通过运用这一概念，我指出古典音乐文化中的不平等、差异和等级制度最终也是以情境依赖的方式出现的，取决于许多社会、主观和物质成分。

== 古典音乐的理想

在本节中，我将讨论与本文主题相关的现有音乐研究，并概述本文如何基于先前研究构建。社会学家安娜·布尔（Anna Bull，2019，第174页）在她关于英国古典音乐文化中阶级与性别不平等的研究中指出，尽管古典音乐的文化和制度框架使音乐家能够表达自我并体验强烈的身份认同与支持，但它也维护了“以欧洲中心主义、启蒙等级制度形式的霸权结构，这些结构使某些人的价值合法化，并确认了他人价值的缺失”。布尔认为，这通过四种方式发生：古典音乐机构确立权威与等级制度的方式，表演实践理想被音乐家具身化的方式，古典音乐理想化秩序与控制的方式，以及最后通过“做对”的美学——这一美学通过设定“高质量表演”的理想，将所有前述模式联系在一起。对于这四种方式的最后一种，布尔将其与对作曲家的忠实、对细节的关注以及演奏正典曲目所需的乐器技巧联系起来（Bull, 2019, 第175–178页）。但什么是这些“高质量表演”，以及种族化和性别化的建构如何引导理想化的表演实践和理想表演人物？

越来越多的研究显示，“理想”的古典音乐家与性别化、种族化和阶级化的建构相关联，这影响了音乐家在古典音乐中不平等体验（Green, 1997; Yang, 2007, 2014; Yoshihara, 2007; Julia, 2008; Hung, 2009; Tan, 2013; Leppänen, 2015; Scharff, 2018a, 2018b; Bull, 2018, 2019; Kowalcyk, 2019; Ewell, 2020; Thurman, 2021）。例如，莱潘宁（Leppänen，2015，第30页）在她关于1995年芬兰国际让·西贝柳斯小提琴比赛媒体报道中如何描绘东亚音乐家的研究中指出，“种族、民族和族裔差异在小提琴家身份的形成中具有构成性”。音乐史学家瑟曼（Thurman，2019，第833–834页；另见Thurman 2021）关于1920年代德国非裔美国音乐厅歌手表演的研究则表明，白人中心主义与黑人身体相对立，被构建进当时的古典音乐正典中。与此相关，音乐会听众的种族化聆听实践揭示，西方艺术音乐假定的“普适性”无法逃脱种族与民族的政治（Thurman, 2019, 第834页）。相反，“它已与其同谋”（Thurman, 2019, 第834页）。

确实，白人中心主义常被视为一种规范，可能因作为未标记范畴而逃避命名（Seikkula, 2019, 第1008页），而白人普适性与天真可以通过“构成它的种族化关系的缺席与消失”来产生和维持，正如研究者赫韦内加德-拉森、斯陶内斯和隆德（Hvenegård-Lassen, Staunæs, & Lund, 2020, 第226页）在他们关于北欧交叉性文章中所指出的。此外，在芬兰讨论白人中心主义一直是一个问题，因为芬兰性并未自明地历史上与西方白人文化相关联（Leppänen, 2015, 第24页）。然而，正是这种“不可见性”、白人规范性的非陌生性，以及古典音乐表演社会想象背后的表达，我希望通过探索白人中心主义如何在芬兰古典音乐文化中与性别不平等相互交织来加以直面。

== 通过访谈理解社会想象

本文的主要研究材料来自十四场按主题划分的深度访谈¹²³，其中一场通过书面形式进行³，这有助于收集深度信息与内在知识（Johnson & Rowlands, 2012, 第100页）。

两位受访者由作者邀请参与研究，其余十二位受访者则响应了在线招募。2020年2月，在芬兰音乐大学西贝柳斯学院的Facebook页面和研究协会Suoni⁴的网页上发布了招募启事，招募自认女性的小提琴手、中提琴手、大提琴手和钢琴手参与研究。钢琴、小提琴和大提琴至今仍是最常作为独奏者与乐团合作的乐器。这些乐器拥有庞大的独奏曲目，并与中提琴共同构成浪漫主义时期常见的室内乐组合。浪漫主义时期为这些乐器创作的曲目至今仍被视为古典音乐的核心曲目，在古典音乐文化中广泛演奏。因此，这些乐器演奏者构成了一个连贯的群体，被选为本研究对象。

其中两场访谈于2019年底进行，其余访谈于2020年春季完成。参与者为十四名芬兰女性音乐家，年龄在25至45岁之间，均为顺性别女性。其中六位是钢琴家，三位是大提琴手，其余五位是小提琴或中提琴手。为确保受访者在芬兰古典音乐小众社区中的匿名性，本文以化名指代参与者。大多数参与者要求在研究结束后销毁其访谈记录（音频和转录文本）。这也表明了研究主题的敏感性。在涉及特别敏感话题的引文中，我甚至避免使用化名。我将访谈引文从芬兰语或瑞典语（均为芬兰官方语言）翻译成英语，从而淡化了可能暴露身份的口音或口语化表达。本文完成前，将作为研究材料的参与者引文请受访者通读，确认引文翻译正确，且自身在引文中不被识别。受访者被问及在音乐教育中记忆深刻的、与音乐表演相关的榜样和理想，以及她们如何与这些理想相关联。

通过前文介绍的Gatens（\[1996\], 2003）和Ahmed（2007）的概念与理解，我分析了芬兰职业古典女性音乐家所识别的、与古典音乐理想表演人物和理想表演实践相关的表征、符号和隐喻中，可以剖析出何种性别化与种族化的身体想象。进一步，我讨论了这些社会想象如何塑造音乐家的具身主体性，并影响她们的自尊、对性别化与种族化身体的理解以及社会价值。我未询问受访者的社会经济地位，因此阶级仅在分析中与社会想象相关时才予以审视。我在本文中论证，某些表演者身体与公认和预期的身体性相关联，其表演能够唤起被视为理想和表演实践参照点的社会想象——从而形成“表演者正典”。在此意义上，本文也扩展了Citron（\[1993\], 2000）关于音乐正典的研究。Citron（\[1993\], 2000, 第195页）承认独奏者能在曲目选择方面行使“巨大权力”，我则进一步阐述：通过习惯性地体现某些理想化的社会想象，被正典化的表演者成为维持和重复规范的理想化人物。在文本某些部分，我还通过展示交叉性社会想象如何受到生活情境、物质现实以及相关表演者和乐器的条件影响，讨论其情境性。此外，我通过展示受访者有时如何反对这些社会想象，讨论社会想象的脆弱性。

最后，与本研究的参与者类似，我本人也是一名受过古典训练的钢琴家，曾在音乐学校和音乐学院长期学习，后来担任钢琴教师和钢琴演奏家。然而，正如Corbin Dwyer和Buckle（2009，第60页）所指出的，“成为某个群体的成员并不意味着在该群体内完全一致”。此外，我的内部/外部身份是受到质疑和模糊的，因为我在性别、民族、种族、语言和职业身份等社会立场上的自我/他者定位方式多种多样（Savvides, Al-Youssef, Colin, & Garrido, 2014，第413页）。这种相对于不同社会类别处于内部/外部和自我/他者之间的位置，被称为“中间空间”（Corbin Dwyer & Buckle, 2009; Hellawell, 2006; Merriam et al., 2001）。Corbin Dwyer和Buckle（2018，第1页）实际上提出，研究者无法占据任何其他位置，只能处于这个中间空间。我作为芬兰白人女性钢琴家的身份，使我能够部分理解所研究领域中女性音乐家面临的文化基础和挑战，这最终影响了本研究理论和方法的选取。例如，我自身对专业演奏乐器的深入了解，帮助我在访谈期间和通过访谈理解那些非话语性或不易言表的演奏体验层面。然而，我作为白人芬兰顺性别女性的社会定位很可能导致了本研究的所有参与者同样为白人顺性别女性。作为一名从事古典音乐研究的白人女性——古典音乐至今仍常被建构为本质上的白人空间（Thurman, 2021）——本研究因此仅提供对古典音乐领域内不平等的有限理解。⁵

此外，我将自己定位为一名行动研究者以及芬兰研究协会Suoni（未注明日期）的成员。⁶ 我与本文所探讨议题的紧密关系，促使我通过研究参与到“慢行动主义”中（Page, Bull, & Chapman, 2019，第1311页）。虽然不平等问题需要快速解决方案和“修正”，但（缓慢的）学术研究可以通过处理不平等问题的复杂性来参与行动主义。通过将本文与这种慢行动主义相联系，我旨在揭示芬兰古典音乐文化现状中当前存在的性别与种族不平等问题，同时提供可用于解决和修复该文化内不平等问题的新内在信息。

== “美丽、娇小和纤细”——揭示理想化女性气质背后的种族化想象

与本研究中的其他乐器演奏者相反，受访的小提琴手提到了一些白人女性小提琴手作为理想化的表演者。许多受访者在青年时期听过国际知名女小提琴手的录音，例如维多利亚·穆洛娃（Victoria Mullova）、安娜-苏菲·穆特（Anne-Sophie Mutter）和伊达·亨德尔（Ida Haendel），以及男小提琴手伊扎克·帕尔曼（Itzhak Perlman）。虽然成为独奏家的机会被描述为男女相对平等，但本研究的受访者桑德拉（Sandra）指出，“当然一直有讨论，女小提琴手是否需要在外表上投资才能获得演出机会。”另一位小提琴手莉亚（Lea）也告诉我，她意识到成功的女音乐家需要“演奏技巧之外的其他东西”，并解释道“所有小提琴文化都是为具有特定外貌的女孩准备的。但当然，每个聪明人都知道这不是真的。”莉亚的评论揭示了女小提琴手身上存在某些偏见，即使“聪明人”知道这些只是社会建构。事实上，在整个研究材料中，女小提琴手被描述为期望她们身材高挑、体型匀称、穿着得体且低调。受访的小提琴手苏珊（Susan）和莉亚在各自的访谈中表示，她们在学习期间被告知自己看起来不像典型的女小提琴手，而老师或同学将典型女小提琴手描述为美丽、纤细、骨骼脆弱、总是看起来“整洁”的女孩。

女性小提琴手面临的性别期望也反映在布尔（Bull）在英国对古典音乐文化研究的结果中。据布尔（2019，第9页）称，在英国，古典音乐与中产阶级关联的“最重要方式之一”是通过“体面的女性气质”，这种女性气质“既为古典音乐所需，也由古典音乐所实践”{ i t } (dag)（Skeggs，1997；另见Green，1997；Citron，2004）。如前所述，本研究的受访者未被问及社会经济地位，也没有受访者明确提到阶级。然而，正如女性主义城市社会地理学家艾莉森·贝恩（Alison Bain，2005，第33页）所指出的，即使艺术家不富裕，他们也可以拥有“文化资本”的象征资本和声望，以及“‘专业人士’头衔所提供的可信度”（另见Bourdieu，1993，第165页）。克里斯蒂娜·科尔贝（Kristina Kolbe，2021，第2页）则主张，古典音乐“被框定为文化价值的最高表达”，并将其与“白人西方上层和中产阶级所体现的社会精英权力”联系起来（另见Bull & Scharff，2017；Bull，2018；Scharff，2018a，2018b）。布尔（2018，第5小节第2段）写道：“古典音乐界揭示了既有中产阶级的规范性性别身份。”盖滕斯（Gatens，\[1996\]，2003）的见解可视为支持这些主张。她（\[1996\]，2003，第viii页）将社会想象理解为“现成的图像”和符号，这些是“（通常是无意识的）想象”，我们通过它们理解身体，并部分决定其价值。我的访谈材料中浮现的一点是，受访的小提琴手被期望确认限制性的西方身体规范，这表明她们的社会价值取决于她们如何确认这些审美理想。与大提琴和钢琴不同，小提琴独奏是站立演奏的，表演者的身体面向观众。小提琴放在左锁骨上，使身体大部分暴露在观众视野中。因此，演奏小提琴的物质条件（Tiainen等人，2020，第7页）塑造了表演者的身体，使其完全暴露在公众视线中。这些物质环境可能在某些情境下使得小提琴手比钢琴家和大提琴家更容易因外貌受到评判。然而，与布尔的研究（2019，第177页）相反，我的大多数受访者似乎并未以她们体验为赋权的方式体现女性体面，反而对性别期望持批评态度。

虽然研究中的其他乐器演奏者较少提及外貌理想，但本次研究采访的钢琴家玛丽指出，她从未见过任何肥胖的女钢琴家在取得音乐成就后仍能保持名气。此外，玛丽指出，当男性钢琴家看起来邋遢时，会被视为“天才”，而同样邋遢的女性则会被视为“疯子”。将男性波西米亚风格的外表与艺术天才的标志联系起来，建立在天才的历史意识形态之上（Bain, 2005, 第29页）。多位研究者（参见Parker & Pollock, 1981; Battersby, 1989; Koskinen, 2006）认为，“天才”概念在许多方面依赖于男性化的范畴。贝恩（Bain, 2005, 第29页）进一步指出，“专业地位在很大程度上来源于借用一套共享的神话和刻板印象，以帮助塑造艺术身份并将其投射给他人。”然而，我的受访者似乎并未严重依赖刻板的外貌理想，反而将这类理想体验为压迫性和伤害性的。然而，这些社会想象也在一定程度上被具身化了。以下例子说明了这一点。

一位小提琴手的体验是：“我一直希望认为这没有影响我，但确实有影响。我记得\[在专业学习期间\]我一直在节食。”她还暗示，节食和饮食失调可能在小提琴学生中很常见，并对瘦削理想持批评态度。她的体验似乎与一位钢琴家相反，后者解释说，她的老师一直告诉她“去健身房”、“多吃点”和“像个男人一样”。她解释说，她感觉“第一个问题就是我是女孩。”无论是通过迎合瘦削理想，还是通过追求“男性气质”，根据我的采访材料，性别化的身体都被期望受到规训。许多研究者也将瘦削理想和对身体的控制的推崇与种族建构和白人中心主义联系起来（Davidauskis, 2015; Dyer, \[1997\], 2002; Strings, 2019, 2020）。

社会学家兼肥胖研究学者萨布丽娜·斯特林斯（Sabrina Strings, 2019, 第211–212页）认为，不应将“瘦理想”聚焦于中上层白人女性，而应关注其背后根植于历史的种族话语：“在艺术、哲学和科学中，胖黑人女性被描绘为‘野蛮’和‘未开化’，在医学中被描绘为‘病态’，这一形象既被用来贬低黑人女性，也被用来规训白人女性。”肥胖作为“他者”服务于将苗条塑造为“精英白人基督教女性的恰当身体形式”（Strings, 2019, 第212页），而正如本研究材料所示，这也适用于芬兰职业音乐家。我认为，通过只推崇西方白人的审美标准（如健美、苗条、高挑、穿着得体），以及只推崇那些肯定这些规范的白人女性，白人中心主义可以被解读为构成了性别化社会想象的背景。此外，小提琴手莉亚指出，所有被理想化的女性音乐家也都是身体健全的。她指出，尽管男小提琴家伊扎克·帕尔曼因小儿麻痹症部分残疾但仍受到赞誉，但她无法想象一个部分残疾的女小提琴家能同样出名和受欣赏。这一评论进一步揭示了本研究中小提琴手所识别的主流理想和规范是如何通过排斥而产生的（van Amsterdam, 2013）。

除了对外貌理想的焦虑外，对表现出非异性恋倾向的担忧在访谈中也普遍存在。一位受访者解释说，她曾感受到音乐家中的普遍不安，那些不按照二元性别角色着装（因而暗示异性恋）的人会遭到异样的眼光。另一位小提琴手则告诉我，这种限制性文化“从某种意义上影响了我，让我思考这些事情，例如我自己的性取向以及他人如何看待它。这让我变得谨慎。”这些评论揭示了对异性恋的理想化以及社会想象背后的种族话语。Dyer（\[1997\], 2002, p. 20）写道：“种族是一种将不同类型的人类身体进行分类的手段，这些身体能够自我繁衍。”此外，“异性恋是确保——同时也是危及——种族试图系统化的差异之繁衍的途径”（Dyer \[1997\], 2002, p. 20）。正如白人中心主义、酷儿与性取向研究者Mason Stokes（2005, p. 132）所言：“白人中心主义需要异性恋来自我繁衍，以保证它所依赖的纯洁的白人未来；另一方面，异性恋则需要白人中心主义——凭借其对无瑕道德的宣称——作为抵御异性恋中性的道德污点的保障，这种污点伴随着身体在黑夜中俯冲的混乱面向。”进一步地，Stokes（2005, p. 145, 148）认为，异性恋在同时生产其必要推论——同性恋——的过程中，也“暴露了构成所谓直人的扭曲之处，定义了正常的怪异之处。”确实，约束自己的性取向也被理论化为“得体女性气质”的重要标志（Nead, 1988; Skeggs, 1997; Bull 2020）。正如艺术史学家Lynda Nead（1988, p. 5）所规定的那样，女性对性取向的表达“决定了她是否被视为社会受尊敬和负责任的成员。”鉴于这些观点，白人女性小提琴手所受的限制性外貌期望因此可以被理解为也中介了白人女性异性恋，因为性和性取向对白人中心主义以及其所支配的假定规范性与从众性构成了潜在威胁。

Ahmed（2007, pp. 156–157）认为，空间的轮廓通过身体的习惯性行为得到中介，空间随后“通过围绕某些特定身体定向而获得‘居住其中’的身体的形状”。“当我们描述机构是‘白人’的时（即机构性白人中心主义），我们指的是机构空间如何通过某些身体而非其他身体的接近来塑造：白人身体聚集并凝聚，形成此类空间的边缘”（Ahmed 2007, p. 157）。在我的研究材料中提到的所有理想化的女性和男性小提琴表演者都是白人，但尽管如此，受访者并未将白人中心主义这一类别本身与性别要求联系起来。这证明了白人中心主义的“不可见性”。此外，Ahmed（2007, p. 158）认为，被白人中心主义铭刻的空间决定了身体需要如何“栖居”白人中心主义“才能‘进入’”该空间。我的受访者所识别的外貌理想周围的符号、再现和图像可以总结为一种社会想象，它理想化了限制性的西方审美标准、苗条、健全身体和异性恋。通过将这些想象与其构建种族建构的方式并行分析，白人中心主义被揭示为一种潜在的社会想象，它支配着芬兰白人女性音乐家的性别化外貌理想。尽管钢琴家和大提琴家也提到了限制性的外貌理想，但这种压迫性规范与小提琴演奏的关联最为强烈。这表明社会想象是情境性的，并受到不同物质条件（如所涉乐器以及演奏它们的身体和文化实践）的塑造（Tiainen et al., 2020）。这些社会想象的复杂情境性在考虑到以下对比时得到进一步支持：与白人女性相反，“异国风情、诱人、易得的性欲形象在美国文化中对亚洲女性的描绘中已作为主要特征存在了一个多世纪，并且在今天的流行文化中仍然非常活跃。”（Yoshihara, 2007, p. 119）。当受访者年轻时，所讨论的社会想象通过导致进食障碍行为和过度严格的身体控制影响了她们的具身心智。然而，在访谈时，本研究的大多数参与者对这些压迫性理想表达了疲惫和批判，并希望颠覆它们。

== “人人都出名。但没有女性。”——体现种族化与性别化社会想象的权威人物

本研究的钢琴家和大提琴家报告称，广受赞誉且值得注意的大提琴家和钢琴家主要是欧洲裔白人男性。研究中的钢琴家被老师鼓励去聆听或观看诸如埃米尔·吉列尔斯、克里斯蒂安·齐默尔曼、伊沃·波格莱里奇、斯维亚托斯拉夫·里赫特、阿尔图罗·贝内代蒂·米开朗杰利、默里·佩拉西亚和克劳迪奥·阿劳等钢琴家的录音或视频。性别支配地位并未被受访音乐家忽视。其中一位钢琴家露西表示：“\[老师\]让我去听的每一位钢琴家……都是男性。所有作曲家也都是男性。”与研究中的大多数钢琴家一样，菲奥娜解释说：“\[她老师钦佩的钢琴家\]都是老男人，也许有一个女人。”此外，接受研究的大提琴家们回忆说，广受赞誉的大提琴家主要是男性，例如马友友、丹尼尔·沙弗兰和特鲁尔斯·莫尔克。其中一位大提琴家莎拉解释说，令人钦佩的大提琴家是“人人都出名。但没有女性。”莎拉和另一位受访者米娅都提到几位芬兰男性大提琴家是广受赞誉的乐器演奏家。此外，米娅说：“无论如何，所有应该被钦佩的人都是男性。”

对女性音乐家的不同态度也体现在参与者的经历中。只提到了几位女性钢琴家，而且大多数是她们自己老师的老师或同事。大提琴家中对女性的赞赏更加稀少。米娅说她很高兴“至少”有杰奎琳·杜·普雷是她钦佩的。然而，在她职业大提琴学习的早期阶段，她得知“杰奎琳·杜·普雷绝对不是你应该钦佩的人。”米娅回忆说，女性大提琴家一再被老师认为“并不真正”优秀，除了那些以“娜塔莉亚·古特曼式男性化演奏风格”演奏的女性大提琴家。这不仅揭示了赋予女性的社会价值的缺乏，还揭示了与男性气质相关的特征如何被理解为有价值的。大提琴家们还指出，在过去的20年里，芬兰唯一的音乐大学——西贝柳斯音乐学院——没有女性大提琴教师、讲师或教授。

尽管大多数理想化的钢琴家和大提琴家都在二十世纪中期左右录制了唱片，但对于本研究采访的音乐家来说，即使在2020年代，他们仍然是最权威的演奏者。这表明专业性和技能的社会想象与那些早已被确立为广受赞誉的演奏者尤其强烈地联系在一起。与本研究的材料所显示的情况相反，二十世纪中期有相当数量的女性职业钢琴家和大提琴家（Ramstedt, 2020, 2021, forthcoming）。尽管许多历史上的女钢琴家和大提琴家获得了声誉并录制了高质量唱片，但在过去，她们中的大多数及其录音后来都被遗忘了。与男性同行相反，女性乐器演奏家在音乐会评论中经常面临性别歧视和性别偏见。相比之下，历史上的白人男性乐器演奏家在音乐会评论中可以被称作“大师”、“巨匠”和“传奇”。（Ramstedt, 2020, 2021, forthcoming）。我在别处（Ramstedt, forthcoming）论证，因为这些男性演奏者早在他们自己的时代就与表达延续性的概念相关联，所以他们及其录音直到今天仍保留为传奇。Citron（\[1993\], 2000, p. 195）讨论了与作曲家和作品相关的录音的力量，并指出“录音保存了可重复的声音演绎，而这些演绎本身可以成为正典。”我认为，当只有某些艺术家和录音被反复确立为传奇和理想时，这就产生了一个由这些精选的著名音乐家组成的“表演者正典”。

受访者几乎完全忽视了女性和黑人、原住民及有色人种钢琴家与大提琴家的录音，这不仅是厌女症的表现，也是种族主义的表现。Ahmed（2007, p. 156）认为，“公共空间通过身体的习惯性行为而塑造，正如空间的轮廓可以被描述为习惯性的。”同样，规范的重复确立了表演者正典，而白人男性身体的过度代表也开始表明这些身体的习惯性。此外，当身体以重复的方式变得习惯时，“它不会引起注意”；相反，它会塑造“身体能做什么”的观念（Ahmed, 2007, p. 156）。虽然本研究的信息提供者批评了性别支配，但种族化支配却完全未被注意到。这种缺乏关注反映了白人规范性或者将白人中心主义视为日常性（或“日常白人中心主义”），通过种族划分的无声假设得以体现（Seikkula, 2019, p. 1005; 另见；Dyer, \[1997\], 2002）。如下文所述，这些理想化的表演者还通过特定的身体倾向和演奏动作被提升为权威人物，这些倾向和动作进一步与白人和男性气质的社会想象相关联。

== 英雄与隐形身体——应对社会想象

权威性和专业性以不同方式与理想的表演实践相关联，通过身体倾向和演奏乐器的特定动作来体现。演奏的理想化完美也与声音相关，小提琴家们将声音理想描述为“干净”、“健康”、“相当直接”和“平衡”。小提琴家苏珊还解释说，审美理想极其狭隘，演奏一切无误是“不现实的”。这些叙述强调理智主义和身体控制。这些含义类似于 Bull (2019) 的“受控兴奋”概念，她将其描述为在演奏需要高超技术技巧的困难作品时发生，也会激发演奏者的激情和兴奋，而这种激情和兴奋同样需要被控制。Bull (2019, p. 23) 进一步注意到宗教实践与音乐实践之间的历史相似性。她 (2019, p. 23) 发现，基督教关于崇高和神圣的宗教观念是某种在身体之外、超越领域的东西，这在她“对古典音乐实践中身体的理论化”中“至关重要”；身体必须既被规训，同时又被抹除或超越”（另见 Eagleton, 1988, 2015; Goehr, 1992; McClary, \[1991\], 2002）。通过借鉴 Dyer (\[1997\], 2002, pp. 15, 17, 30) 关于白人中心主义和超越性的理论化，Bull (2019, p. 104) 指出，“在演奏古典音乐时身体的问题”在于“身体需要在场才能发声，但身体又需要被超越，以便让音乐作品的精神闪耀出来”——这反映了“白人中心主义的悖论”。Dyer (\[1997\], 2002, p. 14) 将这种思想追溯到基督教及其对西方二元论思想的影响：脱离身体的精神仍然以某种方式存在于身体之中。

这进一步反映在以下评论中。钢琴家玛丽回忆说，当年长的男性钢琴家演奏时，焦点只在音乐上。玛丽说，这是 60 岁以上、身着白色领结的男性的“特权”：

走过来坐下，弹奏然后离开。因为他们真的毫无表情……他们是那种老先生，技艺绝对精湛，没有人能质疑他们是否是真正的专业人士。

玛丽的评论暗示，年长白人男性不必证明自己的技能，因为专业性和技艺已经被预设。被正典化的白人男性演奏者进一步与最少的身体动作相关联，这些动作被描述为“建筑式演奏”，其中身体理想上不表现出对情绪的反应。钢琴演奏的坐姿也鼓励最少的动作。由于需要频繁使用踏板，双腿通常必须并拢并保持固定。一位钢琴家菲奥娜说，“你只需要十根手指和一个脑袋”，暗示身体的其他部分都是隐形的。这些评论呼应了女性主义音乐研究者 Lucy Green (1997, pp. 81–82) 的观察：“历史已规定了\[男性乐器演奏者\]的正常性，他们相对透明：我们不必听一个男人打鼓；我们可以听鼓上演奏的音乐……我们在音乐中听不到男性气质；我们假定它。”然而，玛丽本想以最少的动作和受控的兴奋进行演奏，但她说在她身上这常被误解为害羞和拘谨。这说明了与特定身体相关联的价值观和意义如何“影响我们对内在意义的感知”(Green, 1997, p. 56)。

玛丽的评论也指出了最小化身体演奏动作的情境性。当最小化的演奏动作由被正典化的男性演奏者执行时，尤其象征着身体的隐形与超越，但当由本研究中年轻的白人女性钢琴家执行时，它们却象征着别的东西，比如害羞。正如 Tiainen 等人 (2020, p. 2) 所指出的，社会差异总是在具体情境中并通过具体情境而生成。音乐研究者杨 (2007)、吉原 (2007) 和莱潘宁 (2015) 的研究证实了这一点，他们展示了以最小身体动作演奏的亚洲古典音乐家被赋予的意涵与白人男性同行截然不同。Mina Yang (2007, p. 14) 指出，“亚洲人作为机械自动装置、没有灵魂的机器人形象，频繁出现在西方想象中。”此外，莱潘宁 (2015, p. 30) 展示了 1995 年西贝柳斯国际小提琴比赛中亚洲选手的表演在芬兰媒体中被描述为“技术上杰出”却“缺乏诠释能力”。根据芬兰媒体的说法，亚洲音乐家的表演“达不到‘真正’艺术的标准”(Leppänen, 2015, p. 30)。本研究的一些受访者也认为自己音乐诠释的可信度不足。一个典型例子是钢琴家露西解释说：“当然，我可以在这里演奏\[贝多芬的钢琴音乐\]并把它当作\[我的诠释\]来体验——但这并不是\[真正的\]贝多芬。”虽然露西可以以自己的白人身体占据音乐会空间并找到自己对音乐的诠释，但她的评论证实，在她的案例中，“仅仅演奏”不足以将音乐作品提升到象征可信度的社会想象层面。

唯一强调演奏时身体动作幅度大的表演理想出现在中提琴家的访谈中，其中动作幅度大与男性身体和男性气质的内涵紧密关联。参与本研究的一位中提琴家艾米丽告诉我，在芬兰“要拉大提琴，你得非常‘有爷们儿气’。”“女性化”的演奏被认为价值较低，而粗犷、充满阳刚之气、身体动作幅度大、“荷尔蒙奔涌”的演奏方式则被描绘成理想。中提琴家米娅解释说：“围绕\[芬兰大提琴界\]而形成的文化很奇怪。非常男性化，非常英雄主义。”“爷们儿气”在这里主要与白人芬兰大提琴家相关联，他们的表演被赋予暗示异性恋的男性气质内涵。由于可接受的身体性可以被解读为对异性恋规范的白人男性气质和性取向的确认，这些理想再次揭示了种族化想象。研究者 Arto Jokinen (2000) 研究了芬兰语境下的男性、男性气质与暴力。Jokinen (2000, p. 211) 指出，虽然“文化男性气质”（霸权男性气质）被视为自然，但它也通过一系列“男子气概考验”不断被证明和建构。在本研究的背景下，芬兰白人男性气质通过声音和身体方式被证明和表演，大提琴的物质条件支持了这一点 (Tiainen et al., 2020)。大提琴的低沉音色允许大声、粗犷和阳刚的演奏方式。相反，一位大提琴家坚持认为：

#quote(block: true)[有时我感觉自己的目标就是做到无性别。男性通常显得无性别；一个男人几乎就是普遍标准。从某种意义上说，女性无论如何都会因为其女性特质而显得突出，然后性别有时会无意中把注意力从其他事情上转移开。]

正如 Ahmed (2007, p. 158) 所规定的，白人中心主义围绕制度定向，并且“空间延伸了身体，身体也延伸了空间”。因为在古典音乐文化及其表演实践中白人是常态，白人男性身体可以通过实现超越想象或白人霸权男性气质来延伸空间，从而形成构成表演者正典的典型理想。然而，女性的身体会无意中吸引注意力，即使是在演奏大提琴——这种乐器掩盖了演奏者大部分身体——的时候也是如此。这再次确认了社会想象的情境性 (Tiainen et al., 2020)：虽然白人女性身体可以通过相关想象与权威的小提琴演奏相关联，但当与中提琴演奏相关联时，白人女性身体却未能成功做到这一点。

Gatens (\[1996\], 2003, p. 35) 认为“每个个体与其自身身体的特殊关系并不包括对其建构的特权。”换言之，在构建我们自身意识和自我形象时，我们始终通过与外部世界的互动来完成。虽然参与本研究的音乐家能够以白人身体占据古典音乐的空间，但许多参与者却难以将自己视为可信赖或成功的音乐家。此外，通过具身化所呈现的理想，她们体验到自己与这些理想的关系。这伴随着不足感、缺乏自尊、焦虑、演奏相关损伤和舞台恐惧。一位研究参与者告诉我，狭隘的理想“在身体上锁住了我。让我觉得自己做不到。无法以一种理想的方式做到。而且我无法改变成能被接受的样子。”另一位钢琴家坚称，她在青少年时期认为“正在发育的乳房”——即她的性别化身体——是她无法成为可信赖钢琴家的原因。她认为，这与那些“打着白领结的伟大钢琴家”有关。她的评论表明了表演身体的表现所具有的影响。当她出乎自己意料地在比赛中成功并获奖时，参照点的缺失给她带来了问题。成功与她从小接受的角色不符。这意味着，她对自己白人女性身体所能做的事情的内在理解与她的成功发生了冲突。这位钢琴家在访谈中说道：“\[我的\]双手崩溃了，我在精神上也有点崩溃”——仿佛成为并具身化成功钢琴家的角色与她对自己的形象，或者更确切地说，与她身体的社会价值相冲突。Bull (2019, p. 131) 在她的研究中类似地描述道，年轻男性可以想象自己成为指挥家，“渴望占据权威”，而年轻女性更倾向于将自己视为仅仅是权威的服从者。在本研究的参与者中，Mia 同样表示，如果年轻音乐家除了“总是某些男性”之外没有其他榜样，这就变成了一个不断自我实现的“预言”。

== 结语

在本文中，我试图论证普遍接受的表演实践形式以及理想化表演人物的表演如何揭示了芬兰古典音乐文化中仍然盛行的性别化与种族化社会想象。性别不平等体现在男性表演者（尤其是钢琴和大提琴表演）的过度代表中，而构成“优质表演”（Bull, 2019, pp. 175–178）的潜在社会想象则根植于白人中心主义。根据我从本研究访谈材料中得出的发现，表演中的理想身体性包括：钢琴演奏中象征身体隐匿以利于超越性、智识性和“诚实表达”的最小化身体动作；或大提琴演奏中表示异性恋规范的白人男性气质和英雄主义的扩张性动作。此外，所研究女性音乐家的乐器也参与塑造了与表演理想相关的交叉性差异（Tiainen et al., 2020, p. 7）；大提琴的低沉音色支持了男子气概的表演，而钢琴的静态演奏姿势则展示了强调智识性的身体控制。一位受访者最小化的身体动作被解读为害羞，这证实了社会想象的情境性。与这些理想化社会想象相关联的表演者主要是白人男性表演者，我将其称为“表演者正典”。虽然命名另一个正典是否有助于理解限制性理想的后果，或者仅仅是确认了此类社会想象，这一点尚有争议，但我相信，为了解构其权力并注意到其背后的社会文化背景和条件，命名并注意到此类等级制度是必要的。正如 Ahmed (2007, p. 165) 所述，“通过展示我们如何被困住，通过关注世界之‘物’中习惯性和常规性的东西，我们可以保持改变习惯的可能性。”我对“正典”一词的使用绝不意味着正典是积极且静态的。相反，我使用这个术语应被理解为邀请进一步审视和解构它——正如所有其他霸权正典一样。

尽管女性小提琴家报告了大量被视为理想化小提琴家的女性，但她们也体验到了强烈需要遵从异性恋规范的欧洲白人美貌理想，这些理想提倡中产阶级的“可敬女性气质”。小提琴的演奏姿势也参与了表演者身体的安排（Tiainen et al., 2020, p. 7），从而让观众能够完全看到她们身体的前部。这些理想部分被研究的信息提供者所具身化，从而通过施加对身心相互关系的控制，塑造了她们体验自身的方式。此外，大多数女性音乐家偶尔会经历不足感和缺乏自尊、舞台恐惧，甚至因过度强烈的身体控制而受伤。小提琴家尤其与饮食失调和焦虑相关联，因为她们无法通过外貌和行为充分确认异性恋身份。

所有上述理想都是通过研究信息提供者的老师传达给她们的，但也得到了同龄人的进一步确认。这与芬兰音乐教育体系是社会平等象征的观念相矛盾。另一方面，这也表明了芬兰古典音乐界与白人中心主义的根深蒂固。最初，这些理想塑造了信息提供者在青少年及年轻女性时期接受专业音乐学习时的体验。因此，不应低估这些理想的影响。然而，在访谈时，大多数研究参与者对压迫性理想表达了强烈批评，并关注当今面临类似不平等形式的年轻古典音乐家。许多参与者还试图通过自己作为表演者的工作来促进性别平等。这些音乐家对盛行的规范的强烈反对揭示了其不稳定和脆弱的性质。然而，在本研究信息提供者中，种族（或白人规范性）完全未被注意到，尽管白人中心主义是所讨论社会想象的总体背景。因此，为了理解、解构和修复芬兰古典音乐领域的性别不平等，还应关注压迫性性别规范背后的种族建构。

== 注释

1. 为保护参与者匿名，化名不关联具体日期。

受访者1. 作者于赫尔辛基当面访谈。2019年11月29日。

受访者2. 作者于赫尔辛基当面访谈。2019年12月13日。

受访者3. 作者于赫尔辛基当面访谈。2020年3月6日。

受访者4. 作者于赫尔辛基当面访谈。2020年3月7日。

受访者5. 作者于赫尔辛基当面访谈。2020年3月8日。

受访者6. 作者通过视频通话访谈。2020年4月1日。

受访者7. 作者通过视频通话访谈。2020年4月2日。

受访者8. 作者通过视频通话访谈。2020年4月3日。

受访者9. 作者通过视频通话访谈。2020年4月7日。

受访者10. 作者通过视频通话访谈。2020年4月9日。

受访者11. 作者通过视频通话访谈。2020年4月14日。

受访者12. 作者通过视频通话访谈。2020年4月15日。

受访者13. 作者通过视频通话访谈。2020年4月15日。

受访者14. 书面访谈。2020年5月21日。

1. 所有访谈均以音频格式和文本格式保存在赫尔辛基大学的存储云以及研究者自己的电脑中。根据参与者意愿，部分访谈材料将在研究项目完成后销毁，部分访谈材料将保存在指定的档案中。

== 披露声明

作者未报告潜在的利益冲突。

== 资助

本研究得到了芬兰文化基金会（Suomen Kulttuurirahasto）的支持 \[00200911,00210167,00221165\]

== 作者简介

安娜·拉姆斯泰特（音乐硕士与文学硕士）是一位钢琴家、音乐教育工作者和音乐学博士生。她目前正在赫尔辛基大学攻读博士学位。她的研究涉及性别化与性以及情感虐待，以及芬兰古典音乐界内部不平等现象的建构。

== ORCID

Anna Ramstedt http://orcid.org/0000-0002-2356-4023

== References

• Aarnio, P. (2017, June 2). “Music education from Finland: Experiences, exploration and excitement.” Finnish Music Quarterly. https://fmq.fi/articles/music-education-from-finland-experiences-exploration-and-excitement. Last visited 3.8.2021.

• Ahmed, S. (2007). A phenomenology of whiteness. Feminist Theory, 8(2), 149–168.

• André, N., Bryan, K. M., & Saylor, E. (eds.). (2012). Blackness in Opera. Urbana: University of Illinois Press.

• André, N. (2018). Blackness in Opera: History, power, engagement. Urbana: University of Illinois Press.

• Bain, A. (2005). Constructing an artistic identity. Work, Employment and Society, 19(1), 25–46.

• Battersby, C. (1989). Gender and genius: Towards a Feminist Aesthetics. London: The Women’s Press.

• BBC. 2020. Black Classical Music: A Forgotten History. Accessed 11 June, 2022. https://www.bbc.co.uk/programmes/ m000n18w

• Bonds, M. E. (2014). Absolute music: The history of an idea. New York: Oxford University Press.

• Bourdieu, P. (1993). The field of cultural production: Essays on art and literature. Cambridge: Polity Press.

• Bowers, J., & Tick, J. (eds.). (1987). Women making music: The Western Art Tradition, 1150–1950. Urbana: University of Illinois Press.

• Bull, A., & Scharff, C. (2017). ‘McDonald’s music’ versus ‘serious music’: How production and consumption practices help to reproduce class inequality in the classical music profession. Cultural Sociology, 11(3), 283–301.

• Bull, A. (2018). Uncertain capital: Class, gender, and the ‘Imagined futures’of young classical musicians. In C. Dromey & J. Haferkorn (Eds.), The classical music industry. London: Routledge.

• Bull, A. (2019). Class, control, and classical music. New York: Oxford University Press.

• Bull, A. (2020). “Respectabilité” et musique classique: Classe, genre et race au croisement des inégalités dans la formation musicale \[“Respectability” and classical music: Examining the intersections of class, gender and race to understand inequalities in musical training\] in M. Buscatto, M. Cordier and J. Laillier (Eds.), Sous le talent: La classe, la genre, la race. Agone 65. https://agone.org/livres/agone65

• Churcher, M., & Gatens, M. (2019). Reframing honour in heterosexual imaginaries. Angelaki – Journal of the Theoretical Humanities, 24(4), 151–164.

• Cirio, N. P. (2015). Black skin, white music: Afroporteño musicians and composers in Europe in the second half of the Nineteenth Century. Black Music Research Journal, 35(1), 23–40.

• Citron, M. J. (\[1993\] 2000). Gender and the musical canon. Cambridge: Cambridge University Press.

• Citron, M. J. (2004). Feminist waves and classical music: Pedagogy, performance, research. Women and Music: A Journal of Gender and Culture, 8(1), 47–60.

• Corbin Dwyer, S., & Buckle, J. L. (2009). The space between: On being an insider-outsider in qualitative research. International Journal of Qualitative Methods, 8(1), 54–63.

• Corbin Dywer, S., & Buckle, J. L. (2018). Reflections/Commentary on a Past Article: “The Space Between: On Being an Insider-Outsider in Qualitative Research”. International Journal of Qualitative Methods, 17, 1–2.

• Dahlhaus, C. (\[1989\] 1990). The idea of absolute music. Translate from German to English bu Roger Lustig.

• Davidauskis, A. (2015). ‘How beautiful women eat’: Feminine hunger in American popular culture. Feminist Formations, 27(1), 167–189.

• De Lerma, D. R. (1990). Black composers in Europe: A work list. Black Music Research Journal, 10(2), 275–334.

• Dyer, R. (\[1997\], 2002). White. New York: Routledge.

• Eagleton, T. (1988). The ideology of the aesthetics. Poetics Today, 9(2), 327.

• Eagleton, T. (2015). Culture and the death of god (pp. 2015). London: Yale University Press.

• Ellis, K. (1997). Female pianists and their male critics in Nineteenth-Century Paris. Journal of the American Musicological Society, 50(2–3), 353–385.

• European Institute for Gender Equality. (2020). Gender equality index. European Institute for Gender Equality. Accessed 22 June, 2022. https://eige.europa.eu/gender-equality-index/compare-countries,

• Ewell, P. A. (2020). Music theory and white racial frame. Music Theory Online, 26(2), Accessed 22 June, 2022. https:// mtosmt.org/issues/mto.20.26.2/mto.20.26.2.ewell.html

• Finnish Government. (2021). Finland will be a more equal and equitable country where everyone is valuable and where trust in others and society augments. https://valtioneuvosto.fi/en/marin/government-programme/fairequal-and-inclusive-Finland

• Floyd, S. A. (ed.). (1999). International dictionary of black composers. Chicago: Fitzroy Dearborn Publishers.

• Gatens, M. (\[1996\], 2003). Imaginary bodies: Ethics, power and corporeality. New York: Routledge.

• Gatens, M. (2004). Can human rights accommodate women’s rights? Towards an embodied account of social norms, social meanings, and cultural change. Contemporary Political Theory, 3(3), 275–299.

• Goehr, L. (1992). The imaginary Museum of musical works: An essay in the philosophy of music. New York: Oxford University Press.

• Green, L. (1997). Music, gender, education. New York: Cambridge University Press.

• Griffiths, A. (2019). Playing the white man’s tune: Inclusion in elite classical music education. British Journal of Music Education, 37(1), 55–70.

• Hellawell, D. (2006). Inside–out: Analysis of the insider–outsider concept as a heuristic device to develop reflexivity in students doing qualitative research. Teaching in Higher Education, 11(4), 483–494.

• Herbert, P. (2000). Developments in classical music made by black composers in the Twentieth Century. Contemporary Music Review, 19(4), 173–188.

• Huneman, P., & Wolfe, C. T. (2017). Man machines and embodiment – from cartesian Physiology to Claude Bernard’s ‘Living Machine’ in embodiment: A history. (J. E. H. Smith, Edited by). New York: Oxford University Press.

• Hung, E. (2009). Listening to Chineseness on the Western Concert stage: The case of lang lang: Music and the Asian Diaspora. Asian Music, 40(1), 131–148.

• Hvenegård-Lassen, K., Staunæs, D., & Lund, R. (2020). Intersectionality, yes but how? Approaches and conceptualizations in Nordic Feminist research and activism. NORA - Nordic Journal of Feminist and Gender Research, 28(3), pp. 173–182.

• Jean-Francois, I. A. (2020). Julius Eastman: The sonority of blackness otherwise. Current Musicology, 106, Spring. doi:10.52214/cm.v106i.6772.

• Johnson, J. M., & Rowlands, T. (2012). The SAGE handbook of interview research: The complexity of the craft. (J. F. Gurbrium, J. A. Holstein, A. B. Marvasti, & K. D. McKinney, Edited by). California: SAGE Publications.

• Jokinen, A. (2000). Panssaroitu maskuliinisuus: Mies, väkivalta ja kulttuuri. Tampere: Tampere University Press.

• Julia, E. K. (2008). Listening for whiteness: Hearing racial politics in undergraduate school music. Philosophy of Music Education Review, 16(2), 145–155.

• Keskinen, S., Tuori, S., Irni, S., & Diana, M. (eds.). (2009). Complying with Colonialism: Gender, race and ethnicity in the Nordic Region. Furnham: Ashgate.

• Keskinen, S. (2021). Kolonialismin ja rasismin historiaa Suomesta käsin. \[Colonialism and history of racism from the Finnish perspective\]. In S. Keskinen, M. Seikkula and F. Mkwesha (Eds.), Rasismi, valta ja vastarinta: Rodullistaminen, valkoisuus ja koloniaalisuus Suomessa (pp. 69–84). Tallinna: Gaudeamus.

• Keskinen, S., Seikkula, M. & F. Mkwesha (2021). Rasismi, valta ja vastarinta: Rodullistaminen, valkoisuus ja koloniaalisuus Suomessa. In (Ed.), \[Racism, power and resistance: Racialization, whiteness and colonialism in Finland\]. Tallinna: Gaudeamus.

• Kivinen, M., & Ramstedt, A. (forthcoming). Feeling un/comfortable: Positionality and embodied experience in music research. In K. Ramstedt, S. Välimäki, S. Mononen, & K. Ahlsved (Eds.), The activist turn in music research. Bristol: Intellect Books.

• Koivisto, N. (2019). Electric Lights, Champagne, and a Wiener Damenkapelle: Ladies’ Salon Orchestras and Transnational Variety Show Network in Finland, 1877–1916.” PhD diss., University of Helsinki, Helsinki, Finland: Acta Musicologica Fennica. 34.

• Kolbe, K. (2021). Playing the system: ‘Race’-making and elitism in diversity projects in Germany’s classical music sector. Poetics, 87, 1–12.

• Koskinen, T. (ed.). (2006). Kirjoituksia neroudesta – Myytit kultit, persoonat. Tampere: Suomalaisen Kirjallisuuden Seura.

• Kowalcyk, B. (2019). Professional Aspirations in exile: The modest careers of migrant Japanese musicians in Europe. Researchers Sociologiques Et Anthropologique, 50(50–2), 101–122.

• Kubik, S. (2017, December 17). Music education in Finland: The recipe for excellence. France Musique. Accessed 3 June, 2021. https://www.francemusique.fr/en/music-education-finland-recipe-excellence-15699

• Kvist, W. (2020, September 16). “HBL granskar: 93,92 procent av konserterna” \[shortened title\] Hufvudstadsbladet. https://www.hbl.fi/artikel/hbl-granskar-939-procent-av-konserterna-dirigeras-av-man-med-nuvarande-takt kommer-kvinnorna-ika/

• Ledford, J. A. (2020). Joseph Boulogne: The chevalier de Saint-Georges and the problem with Black Mozart. Journal of Black Studies, 51(1), 60–82.

• Leppänen, T. (2015). The West and the Rest of classical music: Asian musicians in the Finnish media coverage of the 1995 Jean Sibelius violin competition. European Journal of Cultural Studies, 18(1), 19–34.

• Lim, L. (2012). The female body and reviews of women pianists in the 1950s London. Women: A Cultural Review, 23(2), 163–181.

• Lofstdóttir, K. & Jensen, L. (2012). Nordic exceptionalism and the Nordic ‘Others. In K. Lofstdóttir & L. Jensen (Eds.), Whiteness and Postcolonialism in the Nordic Region: Exceptionalism, migrant others and national identities (pp. 1– 12). New York: Routledge.

• McClary, S. (\[1991\] 2002). Feminine endings: Music, gender, and sexuality. USA: University of Minnesota.

• Merriam, S. B. Johnson-Bailey, J., Lee, M.-Y., Kee, Y., Ntseane, G., & Muhamad, M. (2001). Power and positionality: Negotiating insider/outsider status within and across cultures. International Journal of Lifelong Education, 20(5), 405–416.

• Ministry of Social Affairs and Health, Finland (n.d.). Finland is a gender equality pioneer. Ministry of Social Affairs and Health. Accessed 3 June, 2021. https://stm.fi/en/Finland-is-a-gender-equality-pioneer

• Moisala, P. (2006). Musiikki säveltäjänerouden kontekstissa – Kaija Saariahon musiikin kokemisen herättämiä pohdintoja \[Music in the context of composer genius myth – Discussing the listening experience of Kaija Saariaho’s music\]. In T. Koskinen (Ed.), Kirjoituksia neroudesta – myytit kultit, persoonat \[Writings on geniusness: Myths, cultures, persons\] Helsinki: SKS

• Mollet, D. (2020, September 23). “Finland’s music education has lessons for others.” China Daily. http://www. chinadaily.com.cn/a/202009/23/WS5f6ab8e4a31024ad0ba7b3ea.html. Last visited 3.6.2021.

• Nead, L. (1988). Myths of sexuality: representations of Women in Victorian Britain. Oxford: Basil Blackwell.

• Neuls-Bates, C. (1982). Women in music: An anthology of source readings from the middle-ages to the present. New York: Harper and Row.

• Page, T., Bull, A., & Chapman, E. (2019). Making power visible: “slow activism” to address staff sexual misconduct in higher education. Violence Against Women, 25(11), 1309–1330.

• Parker, R. & Pollock, G. (1981). Old mistresses: Women, art and ideology. London: Routledge.

• Pendle, K. (Ed.). (\[1991\], 2001). Women and Music: A History. USA: Indiana University Press.

• Ramstedt, A. (2020, August 11). Dags att damma av inspelningarna av historiens glömda pianister. Hufvudstadsbladet. https://www.hbl.fi/artikel/dags-att-damma-av-inspelningarna-av-historiens-glomda-pianister/

• Ramstedt, A. (2021). ‘Den stora och goda musik de små fruntimren åstadkommer’ – Cellons historia är full av fördomar och förenklande uttalanden. Hufvudstadsbladet, 21 July. https://www.hbl.fi/artikel/den-stora-och-godamusik-de-sma-fruntimren-astadkommer-cellons-historia-ar-full-av-fordomar-och/

• Ramstedt, A. (forthcoming). Kenestä on maestroiksi? – Pohdintaa esiintyjien kaanonista ja historian unohtamista muusikoista” \[“Who can be a maestro? – Thoughts about canons and forgotten musicains”\]. In A. Vehviläinen, P. Järviö, S. Rantanen, & N. Koivisto-Kaasik (Eds.), Naiset, Musiikki, Tutkimus – Ennen ja Nyt. Helsinki: DocMus Research Publications and Tutkimusyhdistys Suoni ry.

• Rastas, A. (2012). Reading history through finnish exceptionalism. In K. Lofstdóttir & L. Jensen (Eds.), Whiteness and Postcolonialism in the Nordic Region: Exceptionalism, migrant others and national identities (pp. 89–104). New York: Routledge.

• Suoni, ry. (n.d.). What is Suoni? Accessed June 22, 2022. https://www.suoni.fi/english

• Savvides, N., Al-Youssef, J., Colin, M., & Garrido, C. (2014). Journeys to inner/outer space: Reflections on the methodological challenges of negotiating insider/outsider status in international educational research. Research in Comparative and International Education, 9(4), 412–425.

• Scharff, C. (2018a). Gender, subjectivity, and cultural work: The classical music profession. New York: Routledge.

• Scharff, C. (2018b). Inequalities in the classical music industry: The role of subjectivity in construction of the ‘Ideal classical musician. In C. Dromey & J. Haferkorn (Eds.), The classical music industry. London: Routledge.

• Seikkula, M. (2019). (U)nmaking ‘extreme’ and ‘ordinary’ whiteness: Activists’ narratives on antiracist mobilisation in Finland. The Sociological Review, 67(5), 1002–1017.

• Sirén, V. (2019, September 9). “Suomen klassisen musiikin festivaaleilla” \[In the Finnish classical music festivals\]. Helsingin Sanomat. https://www.hs.fi/paivanlehti/09092019/art-2000006232076.html. Last visited 27.5.2021.

• Skeggs, B. (1997). Formations of class and gender: Becoming respectable. London: Sage.

• Smith, W. E. (2016). Le Mozart Noir: Le Chevalier de Saint-Georges. Bloomington: AuthorHouse.

• Society of Finnish Music Institutions (2019). SML:n Syyspäivät Seinäjoella: Jäsenkyselyn tuloksia. \[Statistics\]. Accessed 22 June, 2022. http://www.musicedu.fi/wp-content/uploads/2020/08/Tilastotietoa-2019.pdf

• Stokes, M. (2005). White Heterosexuality: A romance of the straight Man’s burden. In C. Ingraham (Ed.), Thinking straight: The power, promise, and paradox of Heterosexuality (pp.131–150). New York: Routledge.

• Strings, S. (2019). Fearing the black body: The racial origins of fat Phobia. New York: New York University Press.

• Strings, S. (2020). Women (Re)making whiteness: The sexual exclusion of the fat ‘Black’ Irish. Ethnic and Racial Studies, 43(4), 672–689.

• Sullivan, N. (2012). The somatechnics of perception and the matter of the non/human: A critical response to new materialism. European Journal of Women’s Studies, 19(3), 299–313.

• Tan, S. E. (2013). New Chinese Masculinities on the Piano: Lang Lang and Li Yundi. In R. Harris, R. Pease, & S. E. Tan (Eds.), Gender in Chinese Music. Rochester: University of Rochester Press.

• Thurman, K. (2012). Black Venus, white Bayreuth: Race, sexuality, and the depoliticization of Wagner in postwar West Germany. German Studies Review, 35(33), 607–626.

• Thurman, K. (2019). Performing lieder, hearing race: Debating blackness, whiteness, and German identity in interwar central Europe. Journal of the American Musicological Society, 72(3), 825–865.

• Thurman, K. (2021). Singing like Germans: Black musicians in the land of bach, Beethoven, and brahms. Cornell: Cornell University Press.

• Tiainen, M. (2005). Säveltäjän sijainnit – Taiteilija, musiikki ja historiallinen kesto Paavo Heinosen ja Einojuhani Rautavaaran teksteissä. Jyväskylän yliopisto. Taiteiden ja kulttuurin tutkimuksen laitos/Nykykulttuurin tutkimuslaitos. Nykykulttuurin tutkimuskeskuksen julkaisuja 82.

• Tiainen, M., Leppänen, T., Kontturi, K.-K., & Mehrabi, T. (2020). Making Middles matter: Intersecting intersectionality with new materialism. NORA - Nordic Journal of Feminist and Gender Research, 28(3), 211–223.

• Tompkins, K. W. (2016). On the limits and promise of new materialist philosophy. Journal of the Cultural Studies Assocaition, 5(1).

• Torvinen, J. (2019, October 19). Klassisen musiikin pitää kohdata sortohistoriansa. Helsingin Sanomat \[Classical music needs to face its oppressive history\]. https://www.hs.fi/mielipide/art-2000006278022.html

• Välimäki, S., & Koivisto-Kaasik, N. (2019, February 8). “A series of articles celebrates historical Finnish women who wrote music.” Finnish Music Quarterly. https://fmq.fi/articles/a-celebration-of-women-who-wrote-music

• van Amsterdam, N. (2013). Big fat inequalities, thin privilege: An intersectional perspective on ‘body size.’ European Journal of Women’s Studies, 20(2), 155–169.

• Yang, M. (2007). East meets west in the concert hall: Asians and classical music in the century of imperialism, post-colonialism, and multiculturalism. Asian Music, 38(1), 1–30.

• Yang, M. (2014). Planet Beethoven: Classical music at the turn of the millennium. Middletown, Connecticut: Wesleyan University Press.

• Yoshihara. M. (2oo7). Musicians from a different shore: Asians and Asian Americans in classical music. USA: Temple University Press.

== Footnotes

1. One of the interviews was communicated by writing at the participant’s own wish. The interview subject consisted of sensitive topics that were easier for the participant to express in written form.

2. Suoni (n.d.) is a Finnish research association that practices societally activist music research. The invitation to participate in this research was published on the website https://www.suoni.fi/etusivu/2020/2/20/osallistututkimukseen-sukupuolittuneesta-vallankytst-klassisen-musiikin-kulttuurissa.

3. For a more detailed discussion on positionality in this research, see Kivinen and Ramstedt (forthcoming).

4. The research association Suoni ry (n.d.) practices “societal and action-oriented music research” and seeks “to advance musical practices and music research as a site for societal discussion.”

