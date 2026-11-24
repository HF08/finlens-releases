/* FinLens 内置语料库
 * 文本来源：用户提供的 The Economist PDF，保留原英文正文节选。
 * 结构：article { id, title, deck, source, date, topic, level, paragraphs[], vocab[], knowledge[] }
 * 正文标记：{{术语}} 会渲染为金融知识下划线，点击弹出知识卡。
 */

const TOPICS = [
  { id: 'all', name: '全部主题', en: 'All' },
  { id: 'policy', name: '货币与财政', en: 'Policy' },
  { id: 'markets', name: '债券与市场', en: 'Markets' },
  { id: 'corporate', name: '公司与估值', en: 'Corporate' },
  { id: 'fintech', name: '金融科技', en: 'Fintech' },
  { id: 'em', name: '新兴市场', en: 'EM' },
  { id: 'commodity', name: '大宗商品', en: 'Commodity' },
  { id: 'other', name: '其他', en: 'Other' }
];

const ARTICLES = [
  {
    id: 'eco-inflation',
    title: 'Does high inflation matter?',
    deck: '通胀的经济成本与公众感受并不完全一致，央行需要同时面对数据与心理预期。',
    source: 'The Economist',
    date: '2022-09-24',
    topic: 'policy',
    level: 'C1',
    official: true,
    paragraphs: [
      {
        en: `It started in America, but the surge in {{inflation}} has spread to the rest of the rich world. Consumer prices across the OECD club of mostly rich countries are rising by 10.3%, year on year, the fastest pace of increase in at least three decades. In the Netherlands, inflation is nearing 12%, even higher than in America, while in Estonia it is over 22%. How forcefully should central banks respond to the inflationary surge? The answer depends on how much damage inflation is causing. And that depends on whom you ask.`,
        zh: '通胀最初出现在美国，随后蔓延至其他富裕国家。经合组织成员国的消费价格同比上涨 10.3%，至少是三十年来最快。荷兰通胀接近 12%，爱沙尼亚超过 22%。央行应以多大力度应对？答案取决于通胀造成多大损害，而这又取决于你问谁。',
        note: 'How forcefully ...? The answer depends on ... 是政策分析中常见的“程度取决于成本”结构。',
        analysis: {
          english: {
            longSentence: '主句先陈述通胀扩散，再用两组比较数据建立紧迫性，最后用连续设问引出成本分析。',
            grammar: 'has spread 用现在完成时强调影响延续；the fastest pace 是前面涨幅的同位补充。',
            expression: 'depend on how much damage ... is causing 可直接迁移到政策成本与风险评估写作。'
          },
          finance: {
            term: 'consumer-price inflation',
            background: '通胀衡量一篮子消费品和服务的价格变化，央行通常以核心通胀和通胀预期判断政策压力。',
            relevance: '文章从跨国通胀差异入手，说明同一紧缩政策在不同经济体面临不同成本。'
          }
        }
      },
      {
        en: `Inflation is regarded as costly because it erodes people's savings and distorts price signals. And there are unquestionably instances when it has brought an economy to its knees. During Weimar Germany's period of hyperinflation in the 1920s people's savings evaporated, eliminating the middle class and paving the way for the rise of fascism. Inflation also spiralled out of control in Zimbabwe under Robert Mugabe. As price signals broke down, millions went without food.`,
        zh: '通胀被视为有成本，因为它侵蚀储蓄并扭曲价格信号。历史上确实有经济体因此崩溃：魏玛德国恶性通胀蒸发了储蓄，摧毁中产阶级；津巴布韦通胀失控，价格信号失灵，数百万人缺乏食物。',
        note: 'erodes、distorts、evaporated 三个动词层层强化通胀的破坏机制。',
        analysis: {
          english: {
            longSentence: '第二句用 when 定语从句修饰 instances，随后两个历史例证分别说明储蓄损失与价格信号失灵。',
            grammar: 'paving the way for 是结果状语，表示前一分句造成的长期政治后果。',
            expression: 'bring an economy to its knees 表示使经济陷入瘫痪，适合描述危机而非一般放缓。'
          },
          finance: {
            term: 'hyperinflation',
            background: '恶性通胀通常伴随货币迅速贬值、相对价格剧烈波动和交易媒介功能受损。',
            relevance: '极端案例说明通胀成本真实存在，但不能直接外推到当前约两位数的通胀环境。'
          }
        }
      },
      {
        en: `But in more moderate inflationary episodes, such as the current one, the evidence for economic carnage is weaker. One common worry is that increases in prices outpace rises in wages, causing people's real incomes to decline. This has almost certainly been happening across rich countries in recent months. American real hourly earnings fell by 3.6% in the year to June.`,
        zh: '但在当前这类较温和的通胀中，经济灾难的证据较弱。常见担忧是物价涨幅超过工资，导致实际收入下降。近几个月富裕国家很可能确实出现这种情况，美国截至六月的实际时薪下降 3.6%。',
        note: 'outpace 表示“超过速度”；real earnings 必须和名义工资区分。',
        analysis: {
          english: {
            longSentence: 'such as the current one 插入举例；that 从句解释 worry 的内容，causing 引出工资落后于物价的结果。',
            grammar: 'has been happening 是现在完成进行时，强调近期持续发生的趋势。',
            expression: 'outpace rises in wages 比 wages are lower 更准确地表达相对速度差。'
          },
          finance: {
            term: 'real wages',
            background: '实际工资用名义工资扣除物价变化衡量，不等于工资数字是否上涨。',
            relevance: '实际工资短期下降会制造生活成本压力，但不能单独证明通胀造成长期福利损失。'
          }
        }
      },
      {
        en: `On the whole, though, economists see a tenuous connection between inflation and workers' real living standards. Sometimes prices rise faster than wages; sometimes they do not. British real wages grew strongly during the inflationary era of the 1970s. According to a study published in 1975, American workers, whether unionised or not, had seen inflation-busting pay rises in the preceding decade.`,
        zh: '总体而言，经济学家认为通胀与实际生活水平之间联系并不牢固。有时物价快于工资，有时不是。英国实际工资在 1970 年代通胀期强劲增长；1975 年研究也显示，美国工会与非工会工人在此前十年均获得跑赢通胀的加薪。',
        note: 'tenuous connection 表示关联弱；inflation-busting 指足以抵消通胀影响。',
        analysis: {
          english: {
            longSentence: '两个 sometimes 分句建立对称对照，随后英国与美国例证削弱“通胀必然压低工资”的直觉。',
            grammar: 'whether unionised or not 是让步状语，插在主句主语之后。',
            expression: 'inflation-busting pay rises 是财经媒体常用组合，指高于通胀率的加薪。'
          },
          finance: {
            term: 'bargaining power',
            background: '工资能否追上物价取决于劳动市场紧张程度、工会谈判力、生产率和企业利润率。',
            relevance: '通胀与工资并非机械对立，政策分析必须看分配机制和实际购买力。'
          }
        }
      },
      {
        en: `But they know what they think about inflation: they utterly, implacably loathe it. Inflation seems to hold a special place in the public consciousness. People believe that inflation makes them poorer. They worry it makes it harder to plan. And they believe that inflation is a sign that unscrupulous companies are taking advantage of them.`,
        zh: '但公众知道自己如何看待通胀：他们彻底而不可动摇地厌恶它。通胀似乎占据特殊心理位置。人们相信它让自己更穷、更难规划，并把通胀视为无良企业占便宜的证据。',
        note: 'utterly, implacably loathe it 用双重副词强化情绪，与经济学家的审慎判断形成反差。',
        analysis: {
          english: {
            longSentence: '冒号后的三个短句构成情绪、规划与公平感三个层次，展示公众通胀认知。',
            grammar: 'what they think about inflation 是宾语从句；makes them poorer 是 make + 宾语 + 形容词结构。',
            expression: 'hold a special place in the public consciousness 可用于描述社会议题的心理显著性。'
          },
          finance: {
            term: 'inflation expectations',
            background: '公众对通胀的感受会影响工资谈判、消费和储蓄决策，即使统计成本并不高，也可能通过预期自我实现。',
            relevance: '文章结论是政策不能只看计量成本，还要管理通胀的公信力和分配公平感。'
          }
        }
      }
    ],
    vocab: [
      { w: 'surge', ipa: '/sɜːdʒ/', pos: 'n.', zh: '激增；猛涨', en: 'a sudden large increase', forms: ['surges', 'surged', 'surging'], synonyms: ['spike', 'upsurge'], exam: ['IELTS', 'TOEFL', 'FINANCE'], ex: 'The surge in inflation was broad-based.', exZh: '通胀激增具有广泛基础。' },
      { w: 'erode', ipa: '/ɪˈrəʊd/', pos: 'v.', zh: '侵蚀；逐步削弱', en: 'to gradually reduce the strength or value of something', forms: ['erodes', 'eroded', 'eroding'], synonyms: ['undermine', 'wear away'], exam: ['IELTS', 'FINANCE'], ex: 'Inflation erodes household savings.', exZh: '通胀侵蚀家庭储蓄。' },
      { w: 'distort', ipa: '/dɪˈstɔːt/', pos: 'v.', zh: '扭曲；使失真', en: 'to change information or incentives so they no longer give an accurate signal', forms: ['distorts', 'distorted', 'distorting'], synonyms: ['skew', 'misrepresent'], exam: ['IELTS', 'TOEFL', 'FINANCE'], ex: 'Subsidies can distort price signals.', exZh: '补贴可能扭曲价格信号。' },
      { w: 'evaporate', ipa: '/ɪˈvæpəreɪt/', pos: 'v.', zh: '蒸发；迅速消失', en: 'to disappear completely', forms: ['evaporates', 'evaporated', 'evaporating'], synonyms: ['vanish', 'disappear'], exam: ['IELTS'], ex: 'Real savings can evaporate during hyperinflation.', exZh: '恶性通胀期间实际储蓄可能蒸发。' },
      { w: 'tenuous', ipa: '/ˈtenjuəs/', pos: 'adj.', zh: '薄弱的；不牢固的', en: 'weak and not clearly established', forms: ['more tenuous', 'most tenuous'], synonyms: ['weak', 'fragile'], exam: ['IELTS', 'TOEFL'], ex: 'The evidence for a direct link is tenuous.', exZh: '直接联系的证据并不牢固。' },
      { w: 'dispersion', ipa: '/dɪˈspɜːʃn/', pos: 'n.', zh: '离散程度；分散', en: 'the extent to which values spread around an average', forms: ['price dispersion'], synonyms: ['spread', 'variation'], exam: ['TOEFL', 'FINANCE'], ex: 'Price dispersion can reveal market frictions.', exZh: '价格离散程度可以揭示市场摩擦。' },
      { w: 'implacably', ipa: '/ɪmˈplækəbli/', pos: 'adv.', zh: '不可平息地；坚决地', en: 'in a way that cannot be appeased or changed', forms: ['implacable'], synonyms: ['relentlessly', 'unyieldingly'], exam: ['IELTS'], ex: 'The public remains implacably hostile to inflation.', exZh: '公众始终坚决反对通胀。' }
    ],
    knowledge: [
      { id: 'eco-inflation-k1', term: '实际工资', en: 'Real wages', category: 'finance', categoryReason: '实际工资是用于衡量购买力、工资压力和通胀传导的统计指标，保留在金融术语层。', categoryConfidence: 0.92, one: '名义工资扣除物价变化后的购买力。', body: '实际工资衡量工资能买到多少商品和服务。名义工资上涨 5% 而物价上涨 7%，实际工资仍然下降。分析工资压力时要把工资增速、生产率、通胀和劳动份额放在一起看，不能只看名义数字。', cases: '美国截至 2022 年 6 月的一年内实际时薪下降 3.6%，但不同行业和收入群体差异很大。', related: ['通货膨胀', '购买力', '劳动生产率'], match: ['real wages', 'real living standards', 'real hourly earnings', 'real incomes'] },
      { id: 'eco-inflation-k2', term: '通胀预期', en: 'Inflation expectations', category: 'finance', categoryReason: '通胀预期是可调查、可计量的统计指标，并直接影响资产定价和政策判断。', categoryConfidence: 0.93, one: '家庭、企业和市场对未来物价变化的判断。', body: '通胀预期影响工资谈判、定价和资产配置。如果公众相信央行会控制通胀，短期冲击较难固化为长期预期；若预期失去锚定，工资和价格可能互相追赶。央行因此既看统计通胀，也看调查预期和市场定价。', cases: '1970 年代部分经济体出现工资与物价螺旋，强化了央行对预期管理的重视。', related: ['工资通胀螺旋', '央行公信力', '核心通胀'], match: ['inflation', 'public consciousness'] }
    ]
  },
  {
    id: 'eco-short-sellers',
    title: 'Short-sellers are struggling despite a bad year for stocks',
    deck: '股市下跌本应有利于做空者，但融资成本、有限收益和监管压力让这门生意更难。',
    source: 'The Economist',
    date: '2022-09-24',
    topic: 'markets',
    level: 'C2',
    official: true,
    paragraphs: [
      {
        en: `Short-sellers, who bet against the stockmarket, have always been unpopular - and essential. Today's big names rose to fame by exposing corporate wrongdoing and irrational exuberance. Michael Lewis's "The Big Short", a popular account of the global financial crisis of 2007-09, puts the "misfits, renegades and visionaries" who bet against overvalued mortgage-backed debt at the centre of the story.`,
        zh: '做空者押注股市下跌，始终不受欢迎却不可缺少。知名做空者因揭露企业不当行为和非理性繁荣而成名。《大空头》把押注高估抵押债务的“不合群者、叛逆者和远见者”置于危机叙事中心。',
        note: 'unpopular - and essential 用转折对照建立做空者的双重角色。',
        analysis: {
          english: {
            longSentence: '第一句用 who 非限制性定语从句补充做空者定义；第三句主干是 puts A at the centre of B。',
            grammar: 'bet against 表示押注某物下跌；rose to fame by doing 表示通过某事成名。',
            expression: 'expose wrongdoing 与 irrational exuberance 是资本市场报道中的高价值搭配。'
          },
          finance: {
            term: 'short-selling',
            background: '做空者借入证券卖出，期待价格下跌后买回归还，赚取差价。它提供价格发现和流动性，也可能放大踩踏。',
            relevance: '文章先肯定做空的市场功能，再解释为什么其在实践中越来越难盈利。'
          }
        }
      },
      {
        en: `On the face of it this year ought to be a glorious period for short-sellers. Markets have plunged on fears of persistent {{inflation}}. Sagging growth makes it more likely that securities will fall in price rather than be buoyed by a rising tide. Higher interest rates and tighter credit conditions make it harder for poorly performing or outright fraudulent firms to stagger on by loading up on debt. Despite a recent uptick, the S&P 500 index of large American stocks is down by 12%.`,
        zh: '表面看今年应属于做空者。市场因持续通胀担忧暴跌，疲弱增长增加证券下跌概率，更高利率和收紧信贷让差公司更难借债续命。尽管近期反弹，美国大型股标普 500 指数仍下跌 12%。',
        note: 'On the face of it 与 Despite a recent uptick 形成预期和现实的反差。',
        analysis: {
          english: {
            longSentence: '本段先给出有利环境，再用三个并列机制说明为什么公司更脆弱，最后用指数数据量化市场跌幅。',
            grammar: 'makes it more likely that ... 中 it 是形式宾语，真正宾语是 that 从句。',
            expression: 'be buoyed by a rising tide 是“水涨船高”的金融英语比喻。'
          },
          finance: {
            term: 'credit conditions',
            background: '信贷条件收紧意味着融资更贵、更难获得，现金流薄弱的公司更容易暴露风险。',
            relevance: '宏观环境有利于做空，但基金收益还取决于成本、拥挤度、监管和风险管理。'
          }
        }
      },
      {
        en: `Yet other changes have made the lives of short-sellers harder. Thirteen years of almost relentlessly buoyant equity markets, pumped up by low interest rates and a flood of quantitative easing, have left those betting on falling prices bloodied and bruised. Between the start of 2009 and the end of 2021, the S&P 500 quintupled, while HFR's short-bias index dropped by 85%.`,
        zh: '但其他变化让做空者更艰难。低利率和量化宽松推动股市十三年几乎持续上涨，让押注下跌者损失惨重。2009 年初至 2021 年底，标普 500 涨至五倍，而 HFR 空头偏向指数下跌 85%。',
        note: 'buoyant、pumped up、bloodied and bruised 连续使用身体与水位隐喻，强化逆势交易的代价。',
        analysis: {
          english: {
            longSentence: '主语是 Thirteen years of ... markets，pumped up by ... 是过去分词修饰，have left 是谓语，those betting ... 是宾语。',
            grammar: 'while 引导对比分句；quintupled 表示变成五倍，不是增加五倍。',
            expression: 'bloodied and bruised 可比喻连续亏损后的疲惫和受损状态。'
          },
          finance: {
            term: 'quantitative easing',
            background: '量化宽松是央行购买资产、压低长期利率并注入流动性的政策，通常推升风险资产估值。',
            relevance: '长期牛市使做空者持续承受融资成本和机会成本，即使市场转弱也可能尚未修复历史亏损。'
          }
        }
      },
      {
        en: `And even if a bet is successful, the potential return is capped while the potential loss is not: a stock's price cannot fall below zero, but it can rise indefinitely. "I can make good money on our short calls," says Mr Block, "but it's hardly life-changing money."`,
        zh: '即使押注成功，潜在收益有上限而损失没有：股价最低为零，却可以无限上涨。布洛克说，做空判断可以赚钱，但很难带来改变命运级别的回报。',
        note: 'capped while ... is not 用对照解释做空收益结构的非对称性。',
        analysis: {
          english: {
            longSentence: 'even if 引导让步从句；冒号后用两句平行结构说明收益和损失的上下界。',
            grammar: 'capped 是过去分词作表语，表示被设上限；indefinitely 修饰 can rise。',
            expression: 'asymmetric payoff 可概括这种“收益有限、损失无限”的结构。'
          },
          finance: {
            term: 'asymmetric payoff',
            background: '做空的最大收益是股价跌至零，理论上最大损失却无上限；借券成本和追加保证金还会恶化风险。',
            relevance: '收益结构不对称解释了为什么正确的方向判断不一定产生可持续利润。'
          }
        }
      },
      {
        en: `The final, euphoric phase of the recent bull market was accompanied by a stampede of retail investors into "meme stocks", sometimes motivated by a desire to drive up the price and give short-sellers a bloody nose. At the same time, regulators and enforcement agencies that once used short reports as starting points for criminal investigations are increasingly investigating the short-sellers themselves.`,
        zh: '牛市最后阶段的狂热伴随着散户涌入“迷因股”，有时目的是推高价格并打击做空者。同时，过去把做空报告作为调查起点的监管机构，也开始更频繁调查做空者本身。',
        note: 'stampede、euphoric、bloody nose 构成强烈市场情绪画面。',
        analysis: {
          english: {
            longSentence: '第一句主干是 phase was accompanied by a stampede；sometimes motivated by ... 是过去分词补充散户动机。',
            grammar: 'that once used ... 是定语从句修饰 regulators and enforcement agencies。',
            expression: 'give someone a bloody nose 比喻让对手遭受明显挫折。'
          },
          finance: {
            term: 'meme stock',
            background: '迷因股是受社交媒体情绪和群体交易推动、价格显著偏离传统基本面的股票。',
            relevance: '散户挤空和监管审查一起提高了做空者的操作与法律风险。'
          }
        }
      }
    ],
    vocab: [
      { w: 'unpopular', ipa: '/ʌnˈpɒpjələ(r)/', pos: 'adj.', zh: '不受欢迎的', en: 'not liked by many people', forms: ['popularity', 'unpopularity'], synonyms: ['disliked', 'unfavoured'], exam: ['IELTS'], ex: 'Short-selling remains unpopular with many investors.', exZh: '做空仍不受许多投资者欢迎。' },
      { w: 'exuberance', ipa: '/ɪɡˈzjuːbərəns/', pos: 'n.', zh: '狂热；过度乐观', en: 'excessive energy or optimism', forms: ['exuberant', 'irrational exuberance'], synonyms: ['euphoria', 'overoptimism'], exam: ['IELTS', 'TOEFL', 'FINANCE'], ex: 'Irrational exuberance can inflate asset prices.', exZh: '非理性繁荣会推高资产价格。' },
      { w: 'plunge', ipa: '/plʌndʒ/', pos: 'v.', zh: '暴跌；骤降', en: 'to fall suddenly and steeply', forms: ['plunged', 'plunging'], synonyms: ['slump', 'tumble'], exam: ['FINANCE'], ex: 'Markets plunged on inflation fears.', exZh: '市场因通胀担忧暴跌。' },
      { w: 'buoyant', ipa: '/ˈbɔɪənt/', pos: 'adj.', zh: '繁荣的；有支撑的', en: 'strong and able to recover quickly', forms: ['buoyancy', 'buoyed'], synonyms: ['resilient', 'robust'], exam: ['IELTS', 'FINANCE'], ex: 'The equity market remained buoyant.', exZh: '股市保持强劲。' },
      { w: 'malaise', ipa: '/məˈleɪz/', pos: 'n.', zh: '低迷；潜在困境', en: 'a general feeling of weakness or unease', forms: ['economic malaise'], synonyms: ['slump', 'stagnation'], exam: ['IELTS'], ex: 'The industry has been suffering from malaise.', exZh: '该行业一直处于低迷状态。' },
      { w: 'proliferation', ipa: '/prəˌlɪfəˈreɪʃn/', pos: 'n.', zh: '激增；扩散', en: 'a rapid increase in number', forms: ['proliferate', 'proliferated'], synonyms: ['expansion', 'spread'], exam: ['IELTS', 'TOEFL'], ex: 'The proliferation of data sources changes research.', exZh: '数据源的激增改变了研究方式。' },
      { w: 'malfeasance', ipa: '/ˌmælˈfiːzns/', pos: 'n.', zh: '不当行为；违法失职', en: 'wrongdoing, especially by a public or corporate official', forms: ['corporate malfeasance'], synonyms: ['wrongdoing', 'misconduct'], exam: ['TOEFL', 'FINANCE'], ex: 'Short-sellers often search for corporate malfeasance.', exZh: '做空者经常寻找企业不当行为。' }
    ],
    knowledge: [
      { id: 'eco-short-k1', term: '做空', en: 'Short-selling', category: 'finance', categoryReason: '做空是证券交易与融资机制，直接涉及借券、保证金和损益结构。', categoryConfidence: 0.98, one: '借入证券卖出，期待价格下跌后买回并赚取差价。', body: '做空者向券商借券并卖出，未来买回归还。若股价下跌则盈利，若上涨则亏损，同时还要支付借券费和可能的保证金。做空有助于价格发现，但在拥挤和对冲交易中可能放大波动。', cases: '2007-09 金融危机中，部分投资者做空抵押贷款相关证券并获得巨大收益。', related: ['保证金', '证券借贷', '价格发现'], match: ['short-sellers', 'bet against the stockmarket', 'short-selling'] },
      { id: 'eco-short-k2', term: '非对称收益', en: 'Asymmetric payoff', category: 'finance', categoryReason: '收益结构是金融工具与交易策略的核心定价特征。', categoryConfidence: 0.97, one: '收益上限固定而损失可能远高于预期。', body: '股票价格最低为零，所以做空的理论最大利润有限；价格理论上可以无限上涨，因此损失无上限。保证金追加、借券成本和逼空会进一步放大风险，这就是做空“方向正确也未必赚钱”的结构性原因。', cases: '迷因股逼空使部分空头基金在短时间内承受巨额损失。', related: ['无上限损失', '尾部风险', '逼空'], match: ['potential return is capped', 'potential loss is not', 'meme stocks'] }
    ]
  },
  {
    id: 'eco-state-surplus',
    title: 'States have historic amounts of leftover cash',
    deck: '美国州政府坐拥历史级财政盈余，但一次性退税与永久减税的风险并不相同。',
    source: 'The Economist',
    date: '2022-09-24',
    topic: 'policy',
    level: 'C1',
    official: true,
    paragraphs: [
      {
        en: `A quirky law calls on Massachusetts to send back billions of tax dollars this year. Passed in 1986, it orders the state to refund taxpayers when revenue growth outpaces wage growth. For the first time since 1987 it has been triggered. Massachusetts must return up to $3bn, 7% of tax revenue.`,
        zh: '马萨诸塞州一项特殊法律要求今年退还数十亿美元税款。该法于 1986 年通过，规定收入增长快于工资增长时应向纳税人退税。它自 1987 年以来首次触发，该州需退还最多 30 亿美元，相当于税收的 7%。',
        note: 'For the first time since ... it has been triggered 用倒装时间状语强调罕见性。',
        analysis: {
          english: {
            longSentence: '第二句主干是 it orders the state to refund taxpayers；when 从句说明触发条件。',
            grammar: 'Passed in 1986 是过去分词作状语；has been triggered 是现在完成被动语态。',
            expression: 'call on someone to do 表示法律或规则要求；outpace 表示增速超过。'
          },
          finance: {
            term: 'tax refund trigger',
            background: '税收自动稳定器可以在收入异常增长时自动退税，减少财政扩张对通胀和居民负担的影响。',
            relevance: '这属于有条件、一次性的财政返还，与永久减税的政策后果不同。'
          }
        }
      },
      {
        en: `Massachusetts is not alone in raking in a surplus. States across the country have smashed revenue records in the past fiscal year. According to the Pew Charitable Trusts, a non-profit outfit, state governments saved $217.1bn in 2021, exceeding the 2019 record by nearly $100bn.`,
        zh: '马萨诸塞州并非唯一获得盈余的州。全国各州上一财年税收创纪录。皮尤慈善信托的数据显示，州政府在 2021 年积累 2171 亿美元，比 2019 年纪录多近 1000 亿美元。',
        note: 'raking in 与 smashed revenue records 是口语化但精确的财政报道表达。',
        analysis: {
          english: {
            longSentence: '第三句以 According to 引出数据来源，exceeding 是现在分词补充比较。',
            grammar: 'a non-profit outfit 是同位语，解释 Pew Charitable Trusts 的性质。',
            expression: 'rake in a surplus 表示大量获得盈余；smash a record 表示大幅刷新纪录。'
          },
          finance: {
            term: 'fiscal surplus',
            background: '财政盈余是收入超过支出的部分。州政府常把它存入应急基金，或用于一次性返还、资本项目和减税。',
            relevance: '盈余规模创纪录，意味着政策讨论从“削减赤字”转向“如何使用意外收入”。'
          }
        }
      },
      {
        en: `An influx of federal dollars during the pandemic spared states from spending savings. Sales-tax revenues soared as federal stimulus cheques, tax credits and unemployment benefits gave people money to spend. {{Inflation}} helped, too. Not only did it boost the price of goods, which increased sales-tax revenues; it also raised salaries, in nominal terms, moving people into higher tax brackets.`,
        zh: '疫情期间联邦资金涌入，使各州无需动用储蓄。刺激支票、税收抵免和失业救济让人们有钱消费，销售税收入随之飙升。通胀也起了作用：商品价格上升提高销售税收入，名义工资上涨又把人们推入更高税档。',
        note: 'Not only did it ...; it also ... 是倒装强调句，解释通胀的双重财政效应。',
        analysis: {
          english: {
            longSentence: '第二句由 as 引导原因状语；第三句用分号连接两个倒装或并列结果。',
            grammar: 'moving people into higher tax brackets 是现在分词结果状语。',
            expression: 'spare someone from doing 表示使某人免于做某事；in nominal terms 强调未扣除通胀。'
          },
          finance: {
            term: 'bracket creep',
            background: '累进税制下，名义工资上涨可能使纳税人进入更高税率档，即使实际购买力没有同步提高。',
            relevance: '通胀会机械性提高税收收入，也会增加居民税负感受，因此盈余并非完全来自真实经济改善。'
          }
        }
      },
      {
        en: `Although the average state carries a debt of $3,641 per resident, none seems to be using its excess revenue to pay off what it owes. Instead, after replenishing rainy-day funds, states are playing with taxes. Thirty-three states and Washington, DC, have passed some sort of tax relief. Many plan to send out rebates.`,
        zh: '尽管各州人均债务约 3641 美元，似乎没有州用超额收入偿债。相反，在补充应急基金后，各州开始调整税收：33 个州和华盛顿特区通过某种减税措施，许多计划发放退税。',
        note: 'Instead 后的 after replenishing ... 用介词短语交代政策顺序。',
        analysis: {
          english: {
            longSentence: 'Although 引导让步；none seems to be using 是主句；Instead 后的分句说明实际政策优先级。',
            grammar: 'after replenishing rainy-day funds 中的 after 是介词，后接动名词。',
            expression: 'rainy-day funds 是财政缓冲基金；“playing with taxes” 在此指调整税收政策。'
          },
          finance: {
            term: 'rainy-day fund',
            background: '应急基金用于经济下行时弥补收入缺口，降低危机中被迫削减支出或加税的压力。',
            relevance: '是否先补储备再减税，决定了财政政策是逆周期缓冲还是顺周期刺激。'
          }
        }
      },
      {
        en: `But changes to tax codes are permanent and risky. The rewards are uncertain; the loss of revenue is immediate. "In theory there is a sweet spot of cutting taxes and increasing growth," said Justin Theal of Pew, "but in practice the examples are few and far between." Forecasters fear a recession, which will make savings more precious and spending more necessary.`,
        zh: '但税制改变是永久且高风险的：收益不确定，收入损失却立即出现。皮尤的贾斯汀·西尔说，理论上减税与增长存在最佳平衡，实践中却很少见。预测者担心衰退，届时储蓄将更珍贵、支出更必要。',
        note: 'rewards are uncertain; loss ... is immediate 形成风险不对称。',
        analysis: {
          english: {
            longSentence: '引语中 there is a sweet spot 是核心判断，but in practice 用现实经验反转。',
            grammar: 'few and far between 是固定表达，表示稀少。',
            expression: 'permanent and risky 与 immediate loss 结合，可用于评估政策承诺的时间结构。'
          },
          finance: {
            term: 'fiscal risk',
            background: '永久减税减少未来收入，却未必带来足够增长；一次性退税不会永久改变税制。',
            relevance: '如果经济下行叠加永久减税，州政府可能同时面对收入下降和储备消耗。'
          }
        }
      }
    ],
    vocab: [
      { w: 'surplus', ipa: '/ˈsɜːpləs/', pos: 'n.', zh: '盈余；过剩', en: 'an amount by which income exceeds spending', forms: ['surpluses', 'trade surplus'], synonyms: ['excess', 'balance'], exam: ['FINANCE', 'IELTS'], ex: 'The state recorded a large budget surplus.', exZh: '该州录得大额预算盈余。' },
      { w: 'outpace', ipa: '/ˌaʊtˈpeɪs/', pos: 'v.', zh: '超过……的速度', en: 'to grow or move faster than something else', forms: ['outpaced', 'outpacing'], synonyms: ['surpass', 'outstrip'], exam: ['IELTS', 'TOEFL'], ex: 'Revenue growth outpaced wage growth.', exZh: '收入增长超过了工资增长。' },
      { w: 'influx', ipa: '/ˈɪnflʌks/', pos: 'n.', zh: '大量流入', en: 'the arrival of a large number of people or things', forms: ['cash influx'], synonyms: ['inflow', 'rush'], exam: ['IELTS', 'TOEFL'], ex: 'An influx of federal funds supported the states.', exZh: '联邦资金的大量流入支持了各州。' },
      { w: 'rebate', ipa: '/ˈriːbeɪt/', pos: 'n.', zh: '返还；退款', en: 'a partial refund of money paid', forms: ['rebates', 'tax rebate'], synonyms: ['refund', 'discount'], exam: ['FINANCE'], ex: 'The state sent rebates to taxpayers.', exZh: '该州向纳税人发放退税。' },
      { w: 'bracket', ipa: '/ˈbrækɪt/', pos: 'n.', zh: '税档；区间', en: 'a range used to classify income or tax rates', forms: ['brackets', 'tax bracket'], synonyms: ['band', 'range'], exam: ['FINANCE'], ex: 'Inflation pushed workers into higher tax brackets.', exZh: '通胀把劳动者推入更高税档。' },
      { w: 'threshold', ipa: '/ˈθreʃhəʊld/', pos: 'n.', zh: '门槛；临界值', en: 'a level that must be reached before something happens', forms: ['thresholds'], synonyms: ['limit', 'cutoff'], exam: ['IELTS', 'TOEFL'], ex: 'Tax cuts depend on a revenue threshold.', exZh: '减税取决于收入门槛。' },
      { w: 'prudent', ipa: '/ˈpruːdnt/', pos: 'adj.', zh: '审慎的；稳健的', en: 'careful and sensible about future risks', forms: ['prudence', 'prudently'], synonyms: ['cautious', 'sensible'], exam: ['IELTS'], ex: 'Building reserves is a prudent strategy.', exZh: '建立储备是审慎策略。' }
    ],
    knowledge: [
      { id: 'eco-surplus-k1', term: '财政盈余', en: 'Fiscal surplus', category: 'finance', categoryReason: '财政盈余是可计量的政府收支差额，属于财税统计指标，保留在金融术语层。', categoryConfidence: 0.9, one: '政府收入超过支出的差额。', body: '财政盈余可能来自经济扩张、一次性转移支付或通胀推高名义税收。支出端决定盈余能否转化为公共服务、偿债或减税。判断政策是否稳健，要看盈余是否持续、债务存量和未来支出义务。', cases: '美国多州在 2021 年录得创纪录税收收入，部分原因是联邦刺激与通胀机械性推高税收。', related: ['财政赤字', '公共债务', '应急基金'], match: ['surplus', 'excess revenue', 'tax revenue'] },
      { id: 'eco-surplus-k2', term: '税档爬升', en: 'Bracket creep', category: 'finance', categoryReason: '税档爬升是可量化的税负变化指标，反映通胀对边际税率和实际收入的影响。', categoryConfidence: 0.9, one: '名义收入增加使纳税人进入更高税率档。', body: '累进所得税按名义收入分档。若通胀使工资上涨但税档未同步指数化，个人会缴纳更高边际税率。政府名义税收增加，居民实际购买力却未必改善，因此它是评估通胀时期税负的重要概念。', cases: '当名义工资因通胀提高而税档固定时，税后实际收入可能下降。', related: ['累进税', '指数化', '实际收入'], match: ['higher tax brackets', 'bracket brackets', 'nominal terms'] }
    ]
  },
  {
    id: 'eco-uk-tax',
    title: 'Many British Conservatives now prefer tax cuts to balanced budgets',
    deck: '英国保守党内部倾向减税，但高通胀意味着财政扩张可能与央行紧缩正面冲突。',
    source: 'The Economist',
    date: '2022-09-24',
    topic: 'policy',
    level: 'C1',
    official: true,
    paragraphs: [
      {
        en: `British politics has become so tumultuous and scandal-ridden that disagreements over policy seem almost courtly. But their consequences can be profound. A rift with Boris Johnson over the economy lay behind the resignation of Rishi Sunak as chancellor of the exchequer on July 5th. This philosophical divide may result in Britain throwing fiscal caution to the wind at precisely the wrong time.`,
        zh: '英国政治如此动荡且丑闻不断，以至于政策分歧显得近乎温文尔雅，但后果可能深远。苏纳克七月辞去财政大臣，背后正是与约翰逊的经济路线裂痕。这种理念分裂可能让英国在错误时点抛弃财政审慎。',
        note: 'so ... that ... 结构用极端政治环境反衬政策分歧的重要性。',
        analysis: {
          english: {
            longSentence: '第一句是 so ... that 结果句；第二句 but 反转；第三句解释辞职原因。',
            grammar: 'lay behind 是过去式，表示构成某事件背后的原因。',
            expression: 'throw fiscal caution to the wind 表示抛弃谨慎，语气比 abandon caution 更强。'
          },
          finance: {
            term: 'fiscal stance',
            background: '财政立场指政府税收与支出的总体方向。扩张性财政会在需求端施压，紧缩性财政则削减需求。',
            relevance: '文章的核心不是减税好坏本身，而是政策时机与货币政策是否冲突。'
          }
        }
      },
      {
        en: `The Conservatives have spent most of their 12 years in government trying to balance budgets: cutting the deficit was their flagship policy when David Cameron was prime minister. Yet some British right-wingers have recently started following a path laid down by America's Republicans, whose pivot from fiscal hawkishness to embracing deficits under President Donald Trump was a sight to behold.`,
        zh: '保守党执政十二年的大部分时间都在追求预算平衡，削减赤字曾是卡梅伦的旗舰政策。但一些英国右翼开始追随美国共和党的路径：后者从财政鹰派转向接受赤字，景象令人侧目。',
        note: 'pivot from A to B 表示政策立场急转；a sight to behold 带反讽。',
        analysis: {
          english: {
            longSentence: '第一句主干 the Conservatives have spent ... trying；第二句 yet 对比过去的平衡预算与新近赤字倾向。',
            grammar: 'whose pivot ... 是非限制性定语从句，修饰 Republicans。',
            expression: 'fiscal hawkishness 与 embrace deficits 构成政策立场对比。'
          },
          finance: {
            term: 'fiscal hawk',
            background: '财政鹰派强调控制赤字和债务，通常支持削减支出或提高税收，而非持续扩张。',
            relevance: '政党立场变化会改变市场对财政可持续性和国债供给的预期。'
          }
        }
      },
      {
        en: `The pressures brought about by an ageing population and slow economic growth have for years deprived tax-cutters of red meat. As a share of GDP, Britain's tax take is on course to rise to its highest in decades. In part this is because Messrs Johnson and Sunak raised national insurance, a payroll tax, to help fund the creaking NHS and social-care system.`,
        zh: '人口老龄化和低增长多年来让减税派缺少可操作空间。英国税收占 GDP 比重预计升至数十年来最高，部分原因是约翰逊和苏纳克提高国民保险这一工资税，为不堪重负的 NHS 和社会照护筹资。',
        note: 'deprived tax-cutters of red meat 是政治比喻，指缺少能激发支持者的实质政策。',
        analysis: {
          english: {
            longSentence: '第一句主语是 The pressures ...，brought about by ... 修饰 pressures，have deprived 是谓语。',
            grammar: 'As a share of GDP 是比例状语；on course to rise 表示预计将上升。',
            expression: 'red meat 在政治语境中指能激发核心支持者的强硬政策。'
          },
          finance: {
            term: 'payroll tax',
            background: '工资税对雇主或雇员工资征收，既是社会保障资金来源，也会影响劳动成本。',
            relevance: '税负上升与公共服务压力并存，使减税诉求更有政治吸引力但财政空间更窄。'
          }
        }
      },
      {
        en: `Mr Trump's tax cuts did indeed stimulate America's economy but at a time when inflation was low and there was therefore room to boost growth. British annual inflation is 9.1% and the Bank of England is trying to reduce economy-wide spending by raising interest rates. Tax cuts would, by injecting cash into the economy, work in the opposite direction.`,
        zh: '特朗普减税确实刺激了美国经济，但当时通胀低，有空间推动增长。英国年通胀为 9.1%，央行正通过加息压缩经济支出。减税向经济注入现金，方向恰好相反。',
        note: 'by injecting cash ... 是方式状语，work in the opposite direction 概括政策冲突。',
        analysis: {
          english: {
            longSentence: '第一句用 but 对比政策效果与当时条件；第三句用 by doing 说明传导机制。',
            grammar: 'there was room to boost growth 中 room 表示政策空间，不是物理空间。',
            expression: 'work in the opposite direction 可直接用于描述财政与货币政策方向冲突。'
          },
          finance: {
            term: 'policy mix',
            background: '政策组合指财政与货币政策的方向搭配。通胀高企时，扩张财政会抵消加息对需求的抑制。',
            relevance: '减税可能刺激增长，但在供给受限和通胀偏高时也会推高需求与利率压力。'
          }
        }
      },
      {
        en: `If the central bank raises interest rates even higher as a result, the government's bills will follow. The pandemic sent Britain's public debt soaring to almost 84% of GDP. A one-percentage-point rise in interest rates causes the government's annual debt-service costs to rise by 0.5% of GDP within a year, according to the Office for Budget Responsibility.`,
        zh: '若央行因此进一步加息，政府账单也会上升。疫情使英国公共债务升至 GDP 的近 84%。预算责任办公室称，利率上升一个百分点会使政府年度偿债成本在一年内增加 GDP 的 0.5%。',
        note: "the government's bills will follow 用拟人化短句说明债务成本会随后上升。",
        analysis: {
          english: {
            longSentence: '条件句与结果句相连，随后用债务存量和债务服务成本两个数据支撑风险。',
            grammar: 'as a result 指代前句的减税与通胀压力；causes ... to rise 是使役结构。',
            expression: 'debt-service costs 是偿债成本的标准财经表达。'
          },
          finance: {
            term: 'debt service',
            background: '偿债成本包括利息和到期再融资成本。债务存量越大、利率越高，财政空间越容易被利息支出挤占。',
            relevance: '市场若担心财政扩张导致更高利率，政府融资成本会反过来恶化赤字。'
          }
        }
      }
    ],
    vocab: [
      { w: 'tumultuous', ipa: '/tjuːˈmʌltʃuəs/', pos: 'adj.', zh: '动荡的；混乱的', en: 'full of disorder and change', forms: ['tumult', 'tumultuously'], synonyms: ['turbulent', 'chaotic'], exam: ['IELTS', 'TOEFL'], ex: 'The country experienced a tumultuous period.', exZh: '该国经历了一段动荡时期。' },
      { w: 'rift', ipa: '/rɪft/', pos: 'n.', zh: '裂痕；分歧', en: 'a serious disagreement that divides people', forms: ['rifts'], synonyms: ['split', 'division'], exam: ['IELTS'], ex: 'The economic rift led to a resignation.', exZh: '经济分歧导致了辞职。' },
      { w: 'austerity', ipa: '/ɒˈsterəti/', pos: 'n.', zh: '紧缩；节俭', en: 'government policies that reduce spending to lower deficits', forms: ['fiscal austerity'], synonyms: ['retrenchment', 'belt-tightening'], exam: ['FINANCE', 'IELTS'], ex: 'Austerity policies can slow demand.', exZh: '紧缩政策可能拖累需求。' },
      { w: 'hawkishness', ipa: '/ˈhɔːkɪʃnəs/', pos: 'n.', zh: '鹰派立场；强硬态度', en: 'a strong preference for tight policy or forceful action', forms: ['hawkish', 'fiscal hawk'], synonyms: ['hardline stance', 'tight-policy bias'], exam: ['FINANCE'], ex: 'Fiscal hawkishness gave way to deficit spending.', exZh: '财政鹰派立场让位于赤字支出。' },
      { w: 'creaking', ipa: '/ˈkriːkɪŋ/', pos: 'adj.', zh: '不堪重负的；吱嘎作响的', en: 'weak and close to failing because of age or pressure', forms: ['creak', 'creaked'], synonyms: ['overstretched', 'failing'], exam: ['IELTS'], ex: 'A creaking health system needs investment.', exZh: '不堪重负的医疗系统需要投资。' },
      { w: 'rekindle', ipa: '/ˌriːˈkɪndl/', pos: 'v.', zh: '重新引发；重新点燃', en: 'to cause a feeling or situation to start again', forms: ['rekindled', 'rekindling'], synonyms: ['revive', 'reignite'], exam: ['IELTS'], ex: 'The deficit rekindled fears about financing.', exZh: '赤字重新引发融资担忧。' },
      { w: 'populism', ipa: '/ˈpɒpjəlɪzəm/', pos: 'n.', zh: '民粹主义', en: 'politics that appeals to popular grievances against elites', forms: ['populist', 'fiscal populism'], synonyms: ['demagoguery'], exam: ['IELTS', 'TOEFL'], ex: 'Fiscal populism can defer difficult choices.', exZh: '财政民粹主义可能拖延艰难选择。' }
    ],
    knowledge: [
      { id: 'eco-uk-k1', term: '财政与货币政策组合', en: 'Policy mix', category: 'background', categoryReason: '政策组合描述财政与货币制度之间的宏观协调，归入政策背景。', categoryConfidence: 0.96, one: '财政扩张与货币紧缩同时出现时，需求管理方向可能冲突。', body: '减税和增加支出会推高总需求，而央行加息会压低需求以控制通胀。两者方向相反时，财政扩张可能迫使央行更大幅度加息，并提高政府债务融资成本。评估减税不能只看家庭可支配收入，也要看融资条件与供给瓶颈。', cases: '2022 年英国通胀约 9%，央行加息，而部分保守党主张进一步减税。', related: ['财政乘数', '利率', '需求管理'], match: ['tax cuts', 'raising interest rates', 'work in the opposite direction'] },
      { id: 'eco-uk-k2', term: '偿债成本', en: 'Debt-service cost', category: 'finance', categoryReason: '偿债成本是可计量的财政债务指标，并直接受利率与风险溢价影响。', categoryConfidence: 0.93, one: '政府为存量债务支付的利息和再融资支出。', body: '债务到期结构、浮动利率比例和通胀挂钩债券决定利率变化向财政预算传导的速度。英国有部分债务与通胀挂钩，因此通胀上升本身就会增加利息支出。市场对财政可持续性的担忧也会通过风险溢价推高收益率。', cases: '英国预算责任办公室估计，利率上升 1 个百分点可令年度偿债成本增加 GDP 的 0.5%。', related: ['公共债务', '利率风险', '风险溢价'], match: ['debt-service costs', 'public debt', 'interest rates'] }
    ]
  },
  {
    id: 'eco-gas-tax',
    title: "Biden's gas-tax break is tempting politically but it's a bad idea",
    deck: '汽油税假期在政治上吸引人，却可能收益有限、传导不完全，并削弱道路融资。',
    source: 'The Economist',
    date: '2022-09-24',
    topic: 'commodity',
    level: 'C1',
    official: true,
    paragraphs: [
      {
        en: `Americans are mad about soaring petrol prices. Joe Biden's administration has tried to pin the blame on one man, calling it "Putin's price hike". Analytically, it is true that Russia's invasion of Ukraine is the main reason for the global energy crisis. Politically, though, that has not given much cover to Mr Biden, whose popularity has sagged. On June 22nd the president tried a different form of politicking: he called for a gas-tax holiday for three months.`,
        zh: '美国人对汽油价格飙升非常愤怒。拜登政府试图把责任归咎于普京，称之为“普京涨价”。分析上，俄乌战争确是全球能源危机主因；政治上却未给拜登太多掩护，其支持率下滑。6 月 22 日他呼吁实行三个月汽油税假期。',
        note: 'Analytically ... Politically, though ... 是典型的“分析成立但政治现实不同”对照。',
        analysis: {
          english: {
            longSentence: '前两句描述政治归因；第三句用 it is true that 承认事实；第四句用 whose 定语从句说明民意后果。',
            grammar: 'has sagged 是现在完成时；calling it ... 是现在分词方式状语。',
            expression: 'give political cover to someone 表示替某人提供政治掩护。'
          },
          finance: {
            term: 'energy shock',
            background: '能源价格冲击通过运输、供暖和生产成本向整体通胀传导，其影响取决于替代能源和需求弹性。',
            relevance: '政府需要区分短期价格冲击与长期通胀，税收减免可能刺激需求而非增加供给。'
          }
        }
      },
      {
        en: `For the tax break to work, it would have to deliver much lower prices at the pumps. That is unlikely for three reasons. First, the root cause of high prices is an imbalance between buoyant demand for oil and constrained supply. If the tax holiday were to encourage Americans to hit the road, it could backfire, revving up consumption without solving production bottlenecks.`,
        zh: '汽油税减免要有效，必须显著降低加油站价格，但三点使其难以做到。首先，高油价根源是石油需求强劲而供给受限。若税假期鼓励人们开车出行，只会推高消费却不解决生产瓶颈，可能适得其反。',
        note: 'would have to ... could backfire 用条件句呈现政策目标与激励扭曲的冲突。',
        analysis: {
          english: {
            longSentence: '第一句是目的状语加主句；第三句用 If 条件句、encourage ... to do 和 without doing 说明需求侧副作用。',
            grammar: 'revving up ... 是现在分词结果状语；bottlenecks 指供应链或生产环节的瓶颈。',
            expression: 'deliver lower prices at the pumps 是燃油价格报道中的地道表达。'
          },
          finance: {
            term: 'supply bottleneck',
            background: '供给瓶颈是产能、运输或炼油能力受限，需求刺激无法快速转化为更多供给。',
            relevance: '若供给缺乏弹性，税减免产生的需求增加可能主要转化为更高价格，而非消费者福利。'
          }
        }
      },
      {
        en: `A second snag is the matter of who benefits. Although the break is directed at consumers, producers can respond by raising pre-tax prices. A recent study by the Penn Wharton Budget Model found that when Connecticut, Georgia and Maryland implemented petrol-tax holidays earlier this year, consumers captured as little as 58% of savings.`,
        zh: '第二个障碍是谁受益。虽然减免面向消费者，生产商却可通过提高税前价格吸收部分收益。宾大沃顿预算模型发现，康涅狄格、佐治亚和马里兰今年实行汽油税假期时，消费者拿到的节省一度只有 58%。',
        note: 'The matter of who benefits 把分配问题作为政策评估核心。',
        analysis: {
          english: {
            longSentence: '第二句 Although 引导让步，主句用 can respond by doing 说明企业定价反应。',
            grammar: 'captured as little as 58% of savings 中 as little as 表示低至。',
            expression: 'snag 表示意外障碍；capture savings 表示实际获得政策优惠。'
          },
          finance: {
            term: 'tax pass-through',
            background: '税收转嫁率衡量税收变化最终由消费者、企业还是其他主体承担。市场结构和竞争程度决定转嫁比例。',
            relevance: '汽油税假期并非每单位减免都会落到消费者，企业可能调整税前价格。'
          }
        }
      },
      {
        en: `A final weakness is that there simply is not much fat to cut. The federal tax on petrol is just 18.4 cents a gallon. With prices at around $5 a gallon, a tax holiday would equate to a discount of less than 4%. State taxes are generally low, too. Average petrol taxes in the OECD are nearly five times higher than in America.`,
        zh: '最后一个弱点是可削减空间有限。美国联邦汽油税仅为每加仑 18.4 美分；油价约 5 美元时，税假期折扣不到 4%。州税也普遍较低，经合组织平均汽油税约为美国的五倍。',
        note: 'there simply is not much fat to cut 用比喻说明财政空间有限。',
        analysis: {
          english: {
            longSentence: '第三句 With prices ... 是独立主格背景，主句说明折扣比例。',
            grammar: 'equate to 表示相当于；five times higher than 表示比较倍数。',
            expression: 'there is not much fat to cut 可表示预算或流程中缺乏可削减的冗余。'
          },
          finance: {
            term: 'tax incidence',
            background: '税负归宿关注税收最终由谁承担，而不只是法律上向谁征收。供需弹性决定税收转嫁。',
            relevance: '联邦税率太低，意味着即使完全转嫁，对终端价格的缓解也有限。'
          }
        }
      },
      {
        en: `There is also concern about the fiscal downside. The petrol tax helps pay for America's highways. Mr Biden has pledged to plug the gap with other revenues, but that would take about $2bn a month. Perhaps the best thing that can be said about the tax holiday is that it is unlikely to get through Congress.`,
        zh: '财政风险也值得担心。汽油税为美国公路提供资金，拜登承诺用其他收入填补缺口，但每月约需 20 亿美元。或许对这项税假期最好的评价是：它不太可能通过国会。',
        note: 'the best thing that can be said ... is that ... 用委婉反讽收束。',
        analysis: {
          english: {
            longSentence: '第三句 What can be said about ... 被简化为 the best thing，that 从句给出评价。',
            grammar: 'pledge to plug the gap 中 plug 意为填补；would take 表示将需要。',
            expression: 'fiscal downside 是政策成本中“收入减少与支出义务”的概括。'
          },
          finance: {
            term: 'earmarked revenue',
            background: '专项收入与特定支出绑定。汽油税用于公路维护，减税会造成预算缺口，需要一般财政收入替代。',
            relevance: '短期价格纾困若破坏长期基础设施融资，政策成本会超过家庭获得的有限折扣。'
          }
        }
      }
    ],
    vocab: [
      { w: 'soaring', ipa: '/ˈsɔːrɪŋ/', pos: 'adj.', zh: '飙升的', en: 'rising very quickly', forms: ['soar', 'soared'], synonyms: ['surging', 'skyrocketing'], exam: ['FINANCE'], ex: 'Soaring petrol prices hit household budgets.', exZh: '汽油价格飙升冲击家庭预算。' },
      { w: 'buoyant', ipa: '/ˈbɔɪənt/', pos: 'adj.', zh: '强劲的；活跃的', en: 'strong and lively', forms: ['buoyancy'], synonyms: ['robust', 'strong'], exam: ['IELTS', 'FINANCE'], ex: 'Buoyant demand kept oil prices high.', exZh: '强劲需求使油价保持高位。' },
      { w: 'constrain', ipa: '/kənˈstreɪn/', pos: 'v.', zh: '限制；约束', en: 'to limit what someone or something can do', forms: ['constraints', 'constrained', 'constraining'], synonyms: ['restrict', 'limit'], exam: ['IELTS', 'TOEFL'], ex: 'Supply was constrained by refinery capacity.', exZh: '炼油能力限制了供给。' },
      { w: 'backfire', ipa: '/ˌbækˈfaɪə(r)/', pos: 'v.', zh: '适得其反', en: 'to have the opposite effect from the one intended', forms: ['backfires', 'backfired', 'backfiring'], synonyms: ['misfire', 'boomerang'], exam: ['IELTS'], ex: 'A demand stimulus can backfire when supply is fixed.', exZh: '供给固定时刺激需求可能适得其反。' },
      { w: 'snag', ipa: '/snæɡ/', pos: 'n.', zh: '障碍；暗礁', en: 'an unexpected problem or difficulty', forms: ['snags'], synonyms: ['obstacle', 'hitch'], exam: ['IELTS'], ex: 'The policy hit a legal snag.', exZh: '该政策遇到法律障碍。' },
      { w: 'capture', ipa: '/ˈkæptʃə(r)/', pos: 'v.', zh: '获得；捕获', en: 'to obtain a share of a benefit or value', forms: ['captured', 'capturing'], synonyms: ['obtain', 'secure'], exam: ['FINANCE', 'IELTS'], ex: 'Consumers captured only part of the tax cut.', exZh: '消费者只获得了减税的一部分。' },
      { w: 'pledge', ipa: '/pledʒ/', pos: 'v.', zh: '承诺；保证', en: 'to make a serious promise', forms: ['pledged', 'pledging'], synonyms: ['promise', 'commit'], exam: ['IELTS'], ex: 'The government pledged to fill the funding gap.', exZh: '政府承诺填补资金缺口。' }
    ],
    knowledge: [
      { id: 'eco-gas-k1', term: '税收转嫁', en: 'Tax pass-through', category: 'finance', categoryReason: '税收转嫁是可测量的税负归宿和价格传导指标，保留在金融术语层。', categoryConfidence: 0.88, one: '税收变化最终由消费者或企业承担的比例。', body: '税收转嫁取决于供需弹性、市场结构和竞争程度。如果供给受限且企业有定价权，削减汽油税可能部分被税前价格上调吸收。评估减税效果要比较终端价格变化，而不是只看法定税率。', cases: '美国三州汽油税假期研究发现，消费者获得的节省最低只有 58%。', related: ['税负归宿', '供需弹性', '价格传导'], match: ['pre-tax prices', 'captured as little as 58%', 'petrol-tax holidays'] },
      { id: 'eco-gas-k2', term: '供给瓶颈', en: 'Supply bottleneck', category: 'background', categoryReason: '供给瓶颈来自产业、运输和地缘环境，归入背景层。', categoryConfidence: 0.95, one: '生产、运输或炼油能力限制供给扩张。', body: '当需求强劲但供给无法快速增加时，额外需求更容易推高价格。能源市场的瓶颈可能来自产油能力、炼油产能、运输和地缘冲突。单纯通过减税刺激需求，无法解决这些物理和制度约束。', cases: '俄乌战争与全球炼油能力紧张共同推高成品油价格。', related: ['需求弹性', '产能约束', '能源冲击'], match: ['constrained supply', 'production bottlenecks', 'imbalance'] }
    ]
  }
];

if (typeof module !== 'undefined') { module.exports = { ARTICLES, TOPICS }; }
