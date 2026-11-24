/* 联网核验后的知识卡修订。仅覆盖指定文章中的明确错配或分类错误。 */
window.VERIFIED_KNOWLEDGE_CORRECTIONS = {
  uoweyl8: {
    uoweyl8k0: {
      term: '投资者情绪',
      en: 'Investor Sentiment',
      one: '投资者情绪是市场参与者对风险、收益和未来价格方向的整体态度，常通过资金流、交易行为、波动率和风险溢价表现出来。',
      body: '投资者情绪描述市场参与者愿意承担多少风险、如何解读新信息，以及这种态度如何反映在资产价格和资金流中。它可以作为观察风险偏好和拥挤交易的变量，但情绪不等于现金流、盈利或折现率等基本面，也不能单独证明未来涨跌。极端情绪和逆向交易都需要估值、基本面和流动性验证。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'concept',
      methodSteps: [],
      categoryConfidence: 0.94,
      categoryReason: '联网核验：投资者情绪通过风险偏好、资金流、交易行为和风险溢价影响金融资产价格，主解释对象属于金融市场现象。'
    },
    uoweyl8k2: {
      term: '市场修正',
      en: 'Market Correction',
      one: '市场修正是股票、指数或其他金融资产价格从近期高点明显回落的阶段，常被用于描述风险偏好和估值压力的变化。',
      body: '市场修正通常指广泛股票市场或某一金融资产从近期高点出现明显回撤。媒体和市场参与者常用约 10% 的跌幅描述 correction，但这不是所有交易所或监管机构统一规定的法定阈值；若文章给出具体指数、收盘价或跌幅，应按原文口径记录。修正不同于熊市、崩盘和波动率：熊市通常对应更深或更持久的下跌，崩盘强调下跌速度和交易秩序冲击，波动率描述的是价格波动程度而不是方向。市场修正的主要解释对象是金融资产价格和投资者损失，因此归金融。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'phenomenon',
      cases: '文章讨论的纳斯达克综合指数进入 correction territory，是金融资产价格从阶段高点回撤的市场语境；具体跌幅应回到指数数据核验。',
      scenarios: [
        '主要股指从阶段高点明显回撤',
        '风险偏好下降与高估值资产重新定价',
        '比较 correction、bear market 与 volatility',
        '评估回撤对组合损失和再平衡的影响'
      ],
      indicators: [
        { name: '回撤幅度', meaning: '当前价格相对阶段高点的跌幅', importance: '判断是否达到常见的 correction 区间' },
        { name: '市场广度', meaning: '上涨与下跌成分股的分布', importance: '区分局部回调与广泛市场回撤' },
        { name: '波动率', meaning: '价格波动幅度与频率', importance: '观察风险厌恶和交易压力' },
        { name: '信用利差与收益率', meaning: '信用风险和折现率变化', importance: '判断回撤是否伴随融资条件收紧' }
      ],
      methodSteps: [],
      related: ['bear market', 'drawdown', 'volatility', 'risk-off', 'valuation'],
      match: ['market correction', 'correction territory', 'stock market correction', 'Nasdaq Composite'],
      classificationReason: '市场修正是金融资产价格从阶段高点回撤的现象，不是 ETF 产品说明或分析方法。',
      authority: {
        source: 'Nasdaq',
        description: 'Nasdaq 市场词汇将 market correction 解释为股票市场价格相对短期的下跌。',
        url: 'https://www.nasdaq.com/glossary/m/market-correction'
      },
      categoryConfidence: 0.97,
      categoryReason: '联网核验：对象是股票、指数或其他金融资产价格从近期高点回撤的现象，归入金融术语；10% 是市场惯例，不是统一法定阈值。'
    },
    uoweyl8k3: {
      term: '板块集中度与指数波动',
      en: 'Sector Concentration and Index Volatility',
      one: '当指数中某一板块权重较高时，该板块的冲击可能通过权重效应放大指数层面的波动。',
      body: '指数是按规则和权重汇总的证券组合；科技权重较高的纳斯达克综合指数可能对 AI、半导体和成长股估值变化更敏感。板块集中度提高会把单一板块的特异性冲击更多地传导到指数，但最终指数表现仍取决于其他成分股、相关性、宏观环境和交易流动性，不能仅凭权重推断跌幅。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'mechanism',
      methodSteps: [],
      categoryConfidence: 0.92,
      categoryReason: '联网核验：对象是指数权重、组合集中度和金融市场价格传导，属于金融机制；该表达是文章中的组合解释，不使用法定术语级置信度。'
    },
    uoweyl8k4: {
      term: '循环融资',
      en: 'Circular financing',
      one: '当投资、采购或供应商融资形成可识别的资金闭环，使收入与融资相互支撑并产生真实信用暴露时，才属于需要核验的循环融资。',
      body: '典型链条为：供应商或其基金向 AI 云服务商、模型公司等投入股权或提供信贷，这些企业再用所得资金采购供应商的芯片、服务器或服务。会计上收入与投资分别确认，现金流上投资流出与销售回款方向相反，若只看收入增速会高估需求的独立性与可持续性。风险点在于：客户是否有供应商资金以外的真实付费需求、关联方交易是否充分披露、投资减值的可能性，以及当融资条件收紧时收入是否同步收缩。识别时应看客户集中度、关联方披露、投资与采购在时间上的重合度，以及经营现金流与收入增速是否背离。',
      category: 'finance',
      categories: ['finance', 'background'],
      cardType: 'mechanism',
      methodSteps: [],
      categoryConfidence: 0.9,
      categoryReason: '联网核验：投资、采购、供应商融资和再融资形成实质资金闭环，并影响现金流、融资和信用暴露；金融关系为主，产业背景交叉。该词没有单一统一监管定义。'
    },
    uoweyl8k5: {
      term: '资本开支与现金流',
      en: 'Capital expenditure versus cash flow',
      one: '资本开支是取得或改良长期资产的支出；当分析重点转向它如何挤压自由现金流、扩大融资缺口或提高再融资压力时，卡片属于金融机制。',
      body: '资本开支通常计入投资活动现金流出，并在资产负债表形成长期资产，之后通过折旧或摊销分期进入利润表，所以当期利润不等于当期现金。许多公司用“经营活动现金流减资本开支”计算自由现金流，但 FCF 可能因公司口径、租赁、利息、税收和营运资本调整而不同，应核对报表和非 GAAP 定义。资本开支超过经营现金流时，缺口可能由存量现金、债务或股权融资填补；债务融资又会引入利息覆盖、期限错配和再融资风险。',
      category: 'finance',
      categories: ['finance', 'background'],
      cardType: 'mechanism',
      methodSteps: [],
      categoryConfidence: 0.91,
      categoryReason: '联网核验：主解释对象是资本开支向自由现金流、融资缺口和再融资风险的传导；金融关系为主，实体投资背景交叉。'
    },
    uoweyl8k6: {
      term: 'Wall of Worry',
      en: 'Wall of Worry',
      one: 'Wall of Worry 指市场持续存在担忧、怀疑和负面叙事，但价格仍可能继续上涨的情绪状态。',
      body: '“忧虑之墙”是一个市场情绪隐喻，不是统一的监管或会计术语。它描述投资者普遍保持怀疑、仓位和风险偏好受压，而市场却在担忧中逐步上涨的状态；逆向投资者可能把这种怀疑视为上涨尚未过度拥挤的信号，但情绪无法单独证明估值合理或未来收益。判断时仍需结合盈利、现金流、利率、流动性和估值。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'concept',
      cases: '文章用 wall of worry 描述投资者持续担忧、怀疑，但市场仍可能继续上涨的语境；该表达没有统一的量化阈值。',
      scenarios: [
        '市场存在明显担忧但价格仍保持上行',
        '投资者仓位谨慎而市场广度改善',
        '逆向投资者讨论情绪与估值',
        '区分市场情绪与基本面证据'
      ],
      indicators: [
        { name: '投资者情绪调查', meaning: '散户或机构对市场的看多与看空比例', importance: '观察怀疑是否普遍' },
        { name: '波动率指数', meaning: '市场对未来波动的定价', importance: '反映风险厌恶和担忧程度' },
        { name: '基金资金流与仓位', meaning: '资金申赎和投资者仓位', importance: '判断担忧是否压制参与度' },
        { name: '市场广度', meaning: '上涨股票的参与范围', importance: '判断上涨是否具有广泛支撑' }
      ],
      methodSteps: [],
      related: ['market sentiment', 'contrarian investing', 'risk appetite', 'valuation', 'market breadth'],
      match: ['wall of worry', 'market worried', 'market is worried'],
      classificationReason: '该短语描述投资者担忧与资产价格上行的并存状态，属于金融市场情绪概念，不是牛市定义。',
      authority: {
        source: 'Federal Reserve',
        description: '美联储金融稳定报告提供资产估值、风险偏好和金融市场压力的官方分析入口。',
        url: 'https://www.federalreserve.gov/publications/financial-stability-report.htm'
      },
      categoryConfidence: 0.86,
      categoryReason: '联网核验：该短语描述投资者情绪与资产价格行为，主对象属于金融市场；它不是统一监管术语，置信度低于标准化金融指标。'
    },
    uoweyl8k9: {
      term: 'AI主题交易',
      en: 'AI trade',
      one: 'AI trade 是围绕 AI 算力、半导体、软件和应用资产形成的主题性投资与交易。',
      body: 'AI trade 不是单一资产，而是投资者围绕 AI 产业链和商业化预期形成的一组主题仓位。它同时受技术进展、资本开支、盈利兑现、估值、利率和叙事变化影响；产业趋势可以解释主题来源，但不能代替对具体资产价格、现金流和风险暴露的分析。若卡片改为描述外部冲击导致 AI 资产整体重定价，则应另立“AI trade repricing”卡，并按背景为主、金融交叉处理。',
      category: 'finance',
      categories: ['finance', 'background'],
      cardType: 'phenomenon',
      categoryConfidence: 0.9,
      categoryReason: '联网核验：本卡主对象是 AI 相关资产的投资者仓位和主题交易，金融为主；技术与产业背景交叉。与 AI trade repricing 的外生冲击重定价不同。'
    },
    uoweyl8k10: {
      term: '自由现金流',
      en: 'Free cash flow',
      one: '自由现金流通常指经营活动现金流扣除资本开支后可自由支配的现金，但并非所有会计准则下唯一的法定指标。',
      body: '常见的自由现金流口径是经营活动现金流减去资本开支；部分公司还会调整租赁、利息、税收、营运资本或资产处置。FCF 不是会计利润的替代品：资本开支、营运资本占用和经营现金流变化都可能使它转负。分析公司时应核对报表中的经营活动现金流、投资活动现金流和公司对非 GAAP 指标的定义。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'concept',
      categoryConfidence: 0.96,
      categoryReason: '联网核验：自由现金流是现金流与资本开支相关的财务指标；具体计算口径可能因会计框架和公司非 GAAP 定义而异。'
    },
    uoweyl8k11: {
      term: '超大规模云服务商AI资本开支',
      en: 'Hyperscaler AI capex',
      one: '超大规模云服务商为 AI 基础设施进行的大规模资本开支，是产业与技术基础设施现象，其现金流后果另按财务指标分析。',
      body: 'hyperscaler 通常指运营大规模云平台、服务器和数据中心的企业，具体边界没有统一法律定义。AI 训练和推理需要 GPU、服务器、电力、网络和数据中心，投入通常前置而收入兑现滞后；因此市场会关注资本开支规模、速度、折旧压力和自由现金流，但这些都是金融后果，不能反过来把 AI 基础设施本身定义为金融工具。',
      category: 'background',
      categories: ['background'],
      cardType: 'phenomenon',
      categoryConfidence: 0.92,
      categoryReason: '联网核验：主对象是 AI 基础设施投入和产业行为，现金流影响是后果；保留背景层。hyperscaler 不是统一法律定义。'
    },
    uoweyl8k15: {
      term: '通用目的技术',
      en: 'General Purpose Technology (GPT)',
      one: '通用目的技术指能被广泛用作下游创新输入、持续改进并外溢到多个行业的基础性技术。',
      body: 'General Purpose Technology（GPT）不是指某一个产品，而是经济学中描述技术扩散的概念。典型特征包括：可被大量行业采用、与其他技术形成互补、持续改进并能产生广泛生产率外溢。电力、内燃机和互联网常被引用为历史例子；人工智能被视为潜在的新一代 GPT，但其采用路径、时间滞后和生产率效应仍需实证检验。该概念本身属于技术与经济背景，不是估值方法。',
      category: 'background',
      categories: ['background'],
      cardType: 'concept',
      cases: '电力、内燃机和互联网常被视为通用目的技术；人工智能是潜在候选，但生产率效应和采用时滞仍需实证检验。',
      scenarios: [
        '评估一项技术是否可跨多个行业采用',
        '分析技术扩散与生产率外溢',
        '判断 AI 是否具备通用目的技术特征'
      ],
      indicators: [
        { name: '跨行业渗透率', meaning: '技术被不同行业采用的广度', importance: '判断是否具有通用性' },
        { name: '互补性投资', meaning: '配套设备、流程和组织变革', importance: '决定技术扩散和生产率效果' },
        { name: '全要素生产率', meaning: '无法由资本和劳动投入解释的产出增长', importance: '观察长期经济外溢' }
      ],
      methodSteps: [],
      related: ['technology diffusion', 'general purpose technology', 'productivity spillover', 'S-curve adoption'],
      match: ['general purpose technology', 'technology revolution', 'GPT'],
      classificationReason: '通用目的技术是描述技术扩散、互补性和生产率外溢的经济学背景概念，不是 DCF、久期或估值方法。',
      authority: {
        source: 'Bresnahan & Trajtenberg (1995)',
        description: '关于通用目的技术、增长引擎与技术扩散的经典研究。',
        url: 'https://doi.org/10.1016/0304-4076(94)01607-8'
      },
      categoryConfidence: 0.96,
      categoryReason: '联网核验：通用目的技术是描述技术扩散与生产率外溢的经济学背景概念，不是 DCF、久期或估值方法。'
    },
    uoweyl8k17: {
      term: 'Cost of capital',
      en: 'Cost of capital',
      one: '资本成本是企业为债务和股权融资所需满足的风险调整回报要求，常以加权平均资本成本表示。',
      body: '资本成本由债务成本、股权成本及资本结构共同决定，无风险利率、信用利差、股权风险溢价、税率和杠杆都会影响它。资本成本上升会提高折现率、压低未来现金流现值并提高项目投资门槛；它不是固定常数，也不等于某一种市场利率。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'concept',
      categoryConfidence: 0.97,
      categoryReason: '联网核验：资本成本是债务与股权融资的风险调整回报要求，属于公司金融核心概念。'
    },
    uoweyl8k18: {
      term: 'Showstopper',
      en: 'Showstopper',
      one: '原指极精彩的演出，在商务语境中常指使计划、交易或项目无法推进的严重障碍。',
      body: '该词在本文中不是赞美，而是与 risk becoming a "showstopper" 连用，表示资本成本上升可能使 AI 投资、扩张或交易无法按计划推进。它属于商务语境词汇，不是金融术语。',
      category: 'background',
      categories: ['background'],
      cardType: 'concept',
      categoryConfidence: 0.98,
      categoryReason: '上下文核验：showstopper 在本卡中是一般商务语境词汇，不能因例句涉及融资成本而归为金融术语。'
    },
    uoweyl8k19: {
      term: 'bond yield',
      en: 'Bond yield',
      one: '债券收益率是市场对债券现金流所要求的回报率，具体口径包括当期收益率、到期收益率等；固定利率债券的收益率上升通常对应价格下降。',
      body: '债券价格与收益率的关系取决于债券类型和计算口径。对固定利率债券，市场要求回报上升时，既有债券价格通常下降；公司债收益率还会在无风险基准之上反映信用风险、流动性和期限补偿。阅读财经报道时应区分票息率、到期收益率和持有期回报，不能把不同口径直接比较。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'concept',
      categoryConfidence: 0.98,
      categoryReason: '联网核验：债券收益率是固定收益资产的现金流折现与市场回报口径，属于金融指标。'
    },
    uoweyl8k20: {
      term: 'credit spread',
      en: 'Credit spread',
      one: '信用利差是公司债或其他信用债相对基准收益率的额外补偿，反映违约、流动性、期限和市场供需等因素。',
      body: '信用利差通常用目标债券收益率与同期限无风险或基准收益率的差表示。放贷者要求更高补偿时，信用债收益率相对基准上升，企业融资成本提高；但利差变化不一定只来自违约风险，还可能受流动性、期限、税收、风险偏好和市场供需影响。原文未给出具体利差数据，只能作方向性解释。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'mechanism',
      categoryConfidence: 0.96,
      categoryReason: '联网核验：信用利差是信用债相对基准收益率的补偿，并向企业融资成本传导，属于金融机制。'
    },
    uoweyl8k22: {
      term: 'Bond Investors in Technology Financing',
      en: 'Bond Investors in Technology Financing',
      one: '当高固定成本的 AI 基础设施需要外部债务融资时，债券投资者通过定价信用风险、久期和流动性影响科技公司的融资成本与投资节奏。',
      body: '软件和平台业务的资本开支强度因公司和阶段而异，不能一概称为低固定成本。AI 数据中心、GPU、电力和网络设施可能需要较大的前置投入，企业可能使用经营现金流、债券、贷款、租赁或股权融资。债券投资者关注现金流、杠杆、利息覆盖、抵押和再融资能力，其要求的信用利差和期限溢价会影响公司的融资成本与资本开支节奏；因此本卡的主对象是金融融资关系，技术基础设施作为背景交叉。',
      category: 'finance',
      categories: ['finance', 'background'],
      cardType: 'mechanism',
      categoryConfidence: 0.9,
      categoryReason: '联网核验：主对象是债券投资者、债务融资、信用风险和融资成本，技术基础设施是背景，归金融并交叉背景。'
    },
    uoweyl8k23: {
      term: 'Hyperscaler',
      en: 'Hyperscaler',
      one: '超大规模云服务商是运营大规模服务器、数据中心和云平台的企业类别，具体边界没有统一法律定义。',
      body: 'hyperscaler 通常指拥有大规模云和数据中心基础设施、能够以规模效应提供计算和存储服务的企业。AI 训练和推理需要大量 GPU、服务器、电力和网络设施，因此这类公司的资本开支和经营韧性受到关注；但企业名单、业务范围和资本开支统计口径会随研究机构而变，不能把 hyperscaler 当作一个标准化的金融指标。',
      category: 'background',
      categories: ['background'],
      cardType: 'concept',
      categoryConfidence: 0.92,
      categoryReason: '联网核验：hyperscaler 是企业与基础设施行业类别，不是金融资产或统一指标；金融后果不改变主对象。'
    },
    uoweyl8k24: {
      term: 'Growth insulation',
      en: 'Growth insulation',
      one: 'growth insulation 是文章中的描述性表达，指较强增长机会可能部分缓冲市场对估值、利率和资本开支回报的担忧。',
      body: '当市场担心高估值、利率或资本开支回报时，如果公司仍有较强的增长机会，投资者可能认为其盈利和估值下行压力被部分抵消。但这是条件性、相对性的判断，不表示公司不受利率、流动性或风险偏好变化影响；需要用增长兑现、现金流和估值证据验证。',
      category: 'background',
      categories: ['background'],
      cardType: 'mechanism',
      categoryConfidence: 0.76,
      categoryReason: '上下文核验：growth insulation 是文章中的描述性表达，不是标准金融术语；没有固定指标或计算方式。'
    },
    uoweyl8k25: {
      term: '利率对企业融资的敏感性',
      en: 'Interest-rate sensitivity of corporate borrowing',
      one: '企业融资对利率的敏感性取决于债务成本、期限结构、现金流、杠杆和再融资需求，不能简单等同于所有企业同幅反应。',
      body: '利率上升通常提高新增或浮动利率债务的利息成本，也会提高未来现金流的折现率并改变再融资条件。固定利率、长期限和充足现金流的公司短期敏感度可能较低；高杠杆、短久期或依赖持续再融资的公司敏感度更高。原文中“利率几乎不重要”是高增长公司的条件性观点，不能写成普遍规则。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'mechanism',
      categoryConfidence: 0.94,
      categoryReason: '联网核验：主对象是利率通过债务成本、折现率和再融资条件影响企业融资，属于金融机制。'
    },
    uoweyl8k26: {
      term: '增长动能与价格动量',
      en: 'Growth momentum versus price momentum',
      one: '本文中的 momentum 被作者即时解释为 growth rate，指业务增长动能，而不是技术分析中的价格动量。',
      body: '财经语境中的 momentum 可能指价格趋势延续，也可能指业务增长势头。原文用 meaning its growth rate 作了限定，因此应理解为公司增长动能；只有在讨论价格趋势、交易信号或动量策略时，才按金融市场动量概念解释。',
      category: 'background',
      categories: ['background'],
      cardType: 'concept',
      categoryConfidence: 0.82,
      categoryReason: '上下文核验：本卡主要辨析文章中的词义，growth momentum 在此指业务增长率，不是价格动量策略。'
    },
    uoweyl8k27: {
      term: '高信念持仓',
      en: 'High-conviction position',
      one: '高信念持仓是基金经理基于研究判断，愿意承担较高主动风险、集中配置或长期持有的一类仓位。',
      body: '高信念持仓通常意味着投资者对少数标的的判断更有信心，并愿意接受高于基准的主动份额、集中度和跟踪误差。它可能提高超额收益潜力，也会放大个股特异性风险、流动性和回撤压力；具体权重取决于基金合同、风险限额和流动性管理，不能把“高信念”简单等同于某个固定超配比例。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'concept',
      categoryConfidence: 0.93,
      categoryReason: '联网核验：高信念持仓涉及主动投资、组合集中度、跟踪误差和投资风险，属于投资管理概念。'
    },
    uoweyl8k28: {
      term: '加码（加倍下注）',
      en: 'Double down',
      one: '本文中的 double down 指在市场变化时追加既有投资仓位，从而放大敞口和集中度。',
      body: '在该投资语境中，double down 表示对已有持仓追加投入，可能发生在价格下跌、观点增强或市场风格变化之后。它会提高该标的的组合权重和集中度：判断正确时放大收益，判断错误时放大亏损，并可能增加流动性和回撤压力。它与按目标权重恢复配置的再平衡不是同一操作；原文没有说必然发生在价格下跌时，不能把“下跌加仓”写成唯一定义。',
      category: 'finance',
      categories: ['finance'],
      cardType: 'mechanism',
      categoryConfidence: 0.84,
      categoryReason: '上下文核验：本文中的 double down 是追加投资仓位并放大集中度的行为，归金融；脱离投资语境时应回退背景。'
    }
  },
  uwibb2bk: {
    uwibb2bk0: {
      term: 'jointly controlled equity stake',
      en: 'Jointly controlled equity stake',
      one: '共同控制的上市公司股权把经济收益、投票权、出售与处分限制分布在配偶、信托和受托人之间。',
      body: '该股权首先是上市公司权益资产。谁享有经济收益、投票权、出售权和处分权，会直接影响减持预期、公司控制权、披露口径和市场估值。共同信托、婚姻财产制或受托人治理解释控制权为何分散，但它们是股权关系的背景维度，不改变股权本身属于金融资产。',
      category: 'finance',
      categories: ['finance', 'background'],
      cardType: 'concept',
      categoryConfidence: 0.96,
      categoryReason: '主解释对象是上市公司股权资产及其经济收益、投票、出售、披露和估值关系，金融为主；共同信托与婚姻治理是背景交叉。',
      classificationReason: '股权资产是金融本体；共同控制是治理与法律背景，不把该术语变成纯背景概念。',
      match: ['jointly own', 'co-owned with his wife']
    },
    uwibb2bk13: {
      term: 'divorce asset division',
      en: 'Divorce asset division',
      one: '离婚财产分割首先依据婚姻财产制和信托条款确定财产归属，再处理相关资产的估值、转移与税务。',
      body: '共同财产制与分别财产制处理不同；信托持有的英伟达股份是否属于夫妻财产，要看设立时间、资金来源、受益人、可撤销性和法院裁量。股份分割还涉及估值、流动性、控制权和税务。金融资产和估值关系可以构成交叉，但法律上的财产归属与分配程序仍是主解释对象，不能把该词写成纯金融产品。',
      category: 'background',
      categories: ['background', 'finance'],
      cardType: 'mechanism',
      categoryConfidence: 0.94,
      categoryReason: '主解释对象是婚姻财产制下确定财产归属与分配的法律机制；本案涉及信托持有的公司股份、估值、流动性、控制权和税务，金融关系独立成立，因此背景为主并交叉金融。',
      classificationReason: '法律分配机制不是融资、定价或风险转移工具；金融资产与估值处理是实质交叉，不把主分类改为纯金融。',
      match: []
    }
  }
};
