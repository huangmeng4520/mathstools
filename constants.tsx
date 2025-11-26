import React from 'react';
import { Question } from './types';
import { VerticalMath } from './components/VerticalMath';
import { DotVisualizer } from './components/DotVisualizer';
import { BlockVisualizer } from './components/BlockVisualizer';

export const QUESTIONS: Question[] = [
  // --- PART 1: 题目 1 (Buy Books) ---
  {
    id: 'q1a',
    category: '专项突破：竖式含义',
    title: '第一部分：买文具 (1/2)',
    hint: '看箭头指向的数字“20”，它是怎么算出来的？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          一本故事书 <strong>15</strong> 元，王老师买了 <strong>4</strong> 本。
          <br/>
          请观察竖式，箭头 ① 指向的 <strong>20</strong> 表示什么？
        </p>
        <VerticalMath 
          top="15" 
          bottom="4" 
          steps={[
            { val: "20", label: "①", active: true },
            { val: "40", label: "②" }
          ]}
          result="60"
        />
      </div>
    ),
    options: [
      { id: 'A', text: '4 本书的总价' },
      { id: 'B', text: '4 本书如果是 5 元一本时的价格 (个位 5×4)' },
      { id: 'C', text: '1 本书的价格' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        正确！这个 <strong>20</strong> 是用 4 去乘个位的 5 得到的 (4×5=20)。
        <br/>它是计算过程中的一部分，不是最终的总价。
      </span>
    )
  },
  {
    id: 'q1b',
    category: '专项突破：竖式含义',
    title: '第一部分：买文具 (2/2)',
    hint: '十位上的 1 其实代表多少？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          接上一题。竖式中箭头 ② 指向的 <strong>40</strong> 是由 4 × 1 得到的。
          <br/>
          这里的“1”在十位上，它实际上表示什么？
        </p>
        <VerticalMath 
          top="15" 
          bottom="4" 
          steps={[
            { val: "20", label: "①" },
            { val: "40", label: "②", active: true }
          ]}
          result="60"
        />
      </div>
    ),
    options: [
      { id: 'A', text: '1 个一 (1元)' },
      { id: 'B', text: '1 个十 (10元)' },
      { id: 'C', text: '1 个百 (100元)' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        非常棒！因为 1 在<strong>十位</strong>，所以它代表 <strong>10</strong>。
        <br/>
        这一步算的其实是 10元 × 4本 = 40元。
      </span>
    )
  },

  // --- NEW QUESTION: Disinfectant (Image 2 Q9) ---
  {
    id: 'q_img2_9',
    category: '真题演练：实际意义',
    title: '买消毒液',
    hint: '看圈出来的“6”在什么数位上？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          一种消毒液每瓶 <strong>3</strong> 元，学校买了 <strong>213</strong> 瓶。
          <br/>
          竖式中圈出的 <strong>6</strong> 表示什么？
        </p>
        <VerticalMath 
          top="213" 
          bottom="3" 
          result="639"
          highlights={[{ row: 'result', colIndex: 2 }]} 
        />
      </div>
    ),
    options: [
      { id: 'A', text: '买了 6 瓶消毒液' },
      { id: 'B', text: '买 2 瓶消毒液需要 6 元' },
      { id: 'C', text: '买 200 瓶消毒液需要 600 元' }
    ],
    correctId: 'C',
    explanation: (
      <span>
        答对了！这个 6 在<strong>百位</strong>，表示 600。
        <br/>
        它是用 3 乘百位的 2 (200) 得到的。表示 200 瓶的总价。
      </span>
    )
  },

  // --- NEW QUESTION: Badges (Image 2 Q10) ---
  {
    id: 'q_img2_10',
    category: '真题演练：部分积的含义',
    title: '订购徽章',
    hint: '算式中的“7”在十位上，代表 70。',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          学校订购徽章，每枚 <strong>5</strong> 元，共 <strong>573</strong> 位同学每人一枚。
          <br/>
          竖式计算中，箭头所指的计算过程 <strong>5×7</strong> 表示的是？
        </p>
        <VerticalMath 
          top="573" 
          bottom="5" 
          result=""
          highlights={[{ row: 'top', colIndex: 1, color: 'blue' }]} 
        />
        <div className="text-sm text-gray-500 mt-2 font-mono">
           (箭头指向 5 和 7)
        </div>
      </div>
    ),
    options: [
      { id: 'A', text: '7 枚徽章一共多少元' },
      { id: 'B', text: '70 枚徽章一共多少元' },
      { id: 'C', text: '5 枚徽章一共多少元' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        正确！因为 7 在十位，表示 <strong>70</strong>。
        <br/>
        5 × 70 = 350，表示 70 枚徽章的价格。
      </span>
    )
  },

  // --- NEW QUESTION: Milk (Image 2 Q12) ---
  {
    id: 'q_img2_12',
    category: '真题演练：数位对应',
    title: '买牛奶',
    hint: '圈出来的这一步是用 6 乘以十位上的 1。',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          一箱牛奶有 <strong>12</strong> 盒，每盒 <strong>6</strong> 元。
          <br/>
          竖式中圈出的这一步 (1×6) 表示多少盒牛奶的价格？
        </p>
        <VerticalMath 
          top="12" 
          bottom="6" 
          result="72"
          highlights={[
            { row: 'top', colIndex: 1 }, // Highlight '1' in 12
            { row: 'bottom', colIndex: 0 } // Highlight '6'
          ]}
        />
      </div>
    ),
    options: [
      { id: 'A', text: '1 盒' },
      { id: 'B', text: '10 盒' },
      { id: 'C', text: '6 盒' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        对！竖式十位上的“1”代表 <strong>10</strong>。
        <br/>
        所以 1 × 6 实际上算的是 10 盒牛奶的价格。
      </span>
    )
  },

  // --- NEW QUESTION: Visualizing Carry (Image 1 Q7) ---
  {
    id: 'q_img1_7',
    category: '数形结合：进位理解',
    title: '进位的秘密',
    hint: '找找看，哪一部分凑够了“10”？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          在计算 <strong>14 × 3</strong> 时，竖式中产生了一个进位“1”。
          <br/>
          请看下面的小棒图，虚线圈出的部分，哪一个对应这个进位的“1”？
        </p>
        <div className="flex flex-col items-center">
             <div className="mb-2 font-bold text-gray-500">选项 B 的图示：</div>
             <BlockVisualizer 
                rows={3} 
                tensPerRow={1} 
                onesPerRow={4} 
                highlightOnes={true} // Highlight the ones to show where the carry comes from
             />
             <VerticalMath top="14" bottom="3" result="42" />
        </div>
      </div>
    ),
    options: [
      { id: 'A', text: '左边的整捆小棒 (3个十)' },
      { id: 'B', text: '右边单根小棒里凑出的 10 根' },
      { id: 'C', text: '所有的单根小棒' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        非常棒！
        <br/>
        个位上 4 × 3 = 12。
        <br/>
        12 里面有 <strong>1 个十</strong> 和 2 个一。
        <br/>
        那个进位的“1”，就是从单根小棒里凑出来的这 <strong>1 个十</strong>。
      </span>
    )
  },

    // --- NEW QUESTION: Harder Logic (Image 1 Q6) ---
  {
    id: 'q_img1_6',
    category: '高阶挑战：深层算理',
    title: '数字的由来',
    hint: '想一想，这个 8 是怎么来的？不仅有乘法，还有进位哦。',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          看这个竖式：281 × 3 = 843。
          <br/>
          积在百位上的 <strong>8</strong> 是怎么计算得到的？
        </p>
        <VerticalMath 
          top="281" 
          bottom="3" 
          result="843"
          highlights={[{ row: 'result', colIndex: 2 }]} 
        />
      </div>
    ),
    options: [
      { id: 'A', text: '直接用 2 × 3 得到' },
      { id: 'B', text: '用 2 × 3 = 6，再加上十位进上来的 2' },
      { id: 'C', text: '用 8 × 1 得到' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        太厉害了！
        <br/>
        百位上本身是 2 × 3 = 6 (600)。
        <br/>
        但是十位 8 × 3 = 24，向百位进了 <strong>2</strong>。
        <br/>
        所以最后是 6 + 2 = 8。
      </span>
    )
  },

  // --- PART 1: 题目 2 (Running) ---
  {
    id: 'q2',
    category: '专项突破：易混淆单位',
    title: '跑步比赛',
    hint: '小明跑得很快，但他跑了 3 分钟，不是 300 分钟哦。',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-md">
          小明每分钟跑 <strong>120</strong> 米，他跑了 <strong>3</strong> 分钟。
          <br/>
          竖式中百位上的“3”是怎么来的？
        </p>
        <VerticalMath 
          top="120" 
          bottom="3" 
          result="360"
          highlights={[{ row: 'result', colIndex: 2 }]}
        />
        <p className="mt-2 text-sm text-gray-500">提示：看百位的 1 和乘数 3</p>
      </div>
    ),
    options: [
      { id: 'A', text: '表示跑了 300 分钟' },
      { id: 'B', text: '表示跑了 300 米' },
      { id: 'C', text: '表示每分钟跑 300 米' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        选对啦！百位的 1 代表 100 米。
        <br/>
        100米 × 3 = 300米。
        <br/>
        这是距离，不是时间。
      </span>
    )
  },

  // --- PART 2: 题目 3 (Dot Visualization) ---
  {
    id: 'q3a',
    category: '数形结合：看图懂算理',
    title: '分拆点子图 (1/3)',
    hint: '数一数左边蓝色部分有几列？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-2 text-gray-700 text-center">
          我们要计算 <strong>13 × 3</strong>。把 13 分成了 10 和 3。
          <br/>
          请看图中的 <strong>A 部分 (蓝色)</strong>。
        </p>
        <DotVisualizer highlightSection="A" />
        <p className="mb-2">A 部分表示的算式是？</p>
      </div>
    ),
    options: [
      { id: 'A', text: '3 × 3 = 9' },
      { id: 'B', text: '10 × 3 = 30' },
      { id: 'C', text: '13 × 3 = 39' }
    ],
    correctId: 'B',
    explanation: (
      <span>
        正确！A 部分有 10 列，每列 3 个点。
        <br/>
        所以是 10 × 3 = 30。
      </span>
    )
  },
  {
    id: 'q3b',
    category: '数形结合：看图懂算理',
    title: '分拆点子图 (2/3)',
    hint: '数一数右边绿色部分有几列？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-2 text-gray-700 text-center">
          现在看看 <strong>B 部分 (绿色)</strong>。
        </p>
        <DotVisualizer highlightSection="B" />
        <p className="mb-2">B 部分表示的算式是？</p>
      </div>
    ),
    options: [
      { id: 'A', text: '3 × 3 = 9' },
      { id: 'B', text: '10 × 3 = 30' },
      { id: 'C', text: '13 × 1 = 13' }
    ],
    correctId: 'A',
    explanation: (
      <span>
        对！B 部分是剩下的 3 列，每列 3 个点。
        <br/>
        所以是 3 × 3 = 9。
      </span>
    )
  },
  {
    id: 'q3c',
    category: '数形结合：看图懂算理',
    title: '分拆点子图 (3/3)',
    hint: '找找看，哪里算出来是 30？',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center">
          回到竖式。箭头所指的这一步 (30)，对应的是图中的哪一部分？
        </p>
        <div className="flex flex-col md:flex-row items-center gap-8">
            <VerticalMath 
              top="13" 
              bottom="3" 
              steps={[
                { val: "9" },
                { val: "30", label: "这一步", active: true }
              ]}
              result="39"
            />
            <DotVisualizer highlightSection="NONE" />
        </div>
      </div>
    ),
    options: [
      { id: 'A', text: 'A 部分 (蓝色)' },
      { id: 'B', text: 'B 部分 (绿色)' }
    ],
    correctId: 'A',
    explanation: (
      <span>
        完全正确！竖式里的 30 来自于十位的 1 (也就是10) × 3。
        <br/>
        这正好对应图中左边那一大块 10 × 3 的蓝色圆点。
      </span>
    )
  },

  // --- PART 3: 题目 4 (Concept Check) ---
  {
    id: 'q4',
    category: '举一反三：理解位值',
    title: '买球问题',
    hint: '注意每个数字背后的单位是“元”还是“个”。',
    content: (
      <div className="flex flex-col items-center">
        <p className="mb-4 text-gray-700 text-center max-w-lg">
          体育老师去买皮球，每个皮球 <strong>12</strong> 元，他买了 <strong>4</strong> 个。
          <br/>
          请判断：下面哪种说法是 <strong>不对</strong> 的？
        </p>
        <VerticalMath top="12" bottom="4" result="48" />
      </div>
    ),
    options: [
      { id: 'A', text: '可以看成先买 4 个 2 元的球，再买 4 个 10 元的球，合起来是总价。' },
      { id: 'B', text: '竖式里 4×1=4，这个“4”写在十位上，表示 40 元。' },
      { id: 'C', text: '竖式里 4×1=4，这个“4”表示买了 4 个球。' }
    ],
    correctId: 'C',
    explanation: (
      <span>
        选对了！<strong>C 是错误的</strong>。
        <br/>
        虽然我们买了 4 个球，但竖式计算中，十位上的 1 代表 10 元。
        <br/>
        4 × 10 = 40 元，这里算的还是<strong>钱</strong>，不是球的数量。
      </span>
    )
  }
];