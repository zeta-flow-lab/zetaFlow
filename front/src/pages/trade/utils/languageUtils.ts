
export type Lang = "en" | "zh" | "ko" | "ja";

export const I18N: Record<Lang, any> = {
    en: {
      header: {
        cmd: "Open command palette",
        tagline: "Build Once, Launch Everywhere — with Gemini.",
        connect: "Connect Wallet",
      },
      hero: {
        titlePrefix: "One prompt, ",
        titleHighlight: "trade anywhere",
        byline: "Powered by ZetaChain × Gemini",
      },
      chat: {
        title: "ZetaFlow Copilot",
        badge: "Gemini 2.5",
        initial: "How can I help you today?",
        placeholder: "Example: Swap 10 ZETA in my wallet to POL at the current market price",
        send: "Send",
        parsedAs: "Parsed as:",
      },
      connectModal: {
        title: "Connect Wallet",
        metaMask: "Connect MetaMask",
        metaMaskDesc: "Browser extension or mobile",
        actionKey: "Use Action Key",
        actionKeyDesc: "Action Key / Passkey login",
        note:
          "We don’t store your private key. Before submitting, you’ll see a human-readable summary and simulation results.",
        close: "Close",
      },
      createModal: {
        title: "Create Smart Account (Demo)",
        note:
          "During creation you’ll see a human-readable signature and risk checks. Example address:",
        cancel: "Cancel",
        confirm: "Confirm",
      },
      swapModal: {
        title: "Cross-Chain Swap (Demo)",
        fromChain: "From Chain",
        toChain: "Destination Chain",
        pay: "Pay",
        receive: "Receive",
        estOut: "Estimated output",
        info:
          "Before submitting, you’ll see route/fees/slippage/simulation and a human-readable summary (demo placeholder).",
        cancel: "Cancel",
        confirm: "Confirm Swap (Demo)",
      },
      features: {
        f1_title: "Native Assets",
        f1_tag: "ZetaChain Universal Capability",
        f1_desc:
          "A universal blockchain lets assets reach multiple chains and Bitcoin natively with a single deployment",
        f2_title: "AI Agent",
        f2_tag: "Gemini Intelligence",
        f2_desc:
          "Directly analyzes trading intent from natural language and executes reliably",
        f3_title: "Secure & Controllable",
        f3_tag: "ZetaFlow Risk Controls",
        f3_desc:
          "Extensible pre-checks and risk rules safeguard your assets",
      },
      toasts: {
        createDemo:
          "Wallet creation is demo only; no real on-chain transaction.",
        swapDemo:
          "Cross-chain swap is a UI demo; wire backend/contracts to go live.",
        copied: "Copied to clipboard",
      },
      msgs: {
        create: (n: string) =>
          `Will create a smart account on ${n || "ZetaChain"} (demo).`,
        swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
          `Preparing to swap ${amt ?? "?"} ${from} to ${to} (${s || "?"} → ${d || "?"}).`,
        balance: (token?: string, chain?: string) =>
          `Querying ${chain || "ZetaChain"} for ${token || "all"} balance (demo).`,
        fallback:
          "I didn’t quite get that. Try: create wallet | check balance | swap 1 ETH to BTC on Bitcoin",
      },
    },
  
    zh: {
      header: {
        cmd: "打开命令面板",
        tagline: "Build Once, Launch Everywhere — with Gemini.",
        connect: "连接钱包",
      },
      hero: {
        titlePrefix: "一句话，",
        titleHighlight: "随时随地交易",
        byline: "由 ZetaChain x Gemini 强力驱动",
      },
      chat: {
        title: "ZetaFlow Copilot",
        badge: "Gemini 2.5",
        initial: "今天有什么能帮到您？",
        placeholder: "示例：请你将我钱包中的 10 ZETA 按照当前市场价格换成 POL",
        send: "发送",
        parsedAs: "解析为：",
      },
      connectModal: {
        title: "连接钱包",
        metaMask: "连接 MetaMask",
        metaMaskDesc: "浏览器扩展或移动端",
        actionKey: "使用行动密钥",
        actionKeyDesc: "Action Key / Passkey 登录",
        note:
          "我们不会保存你的私钥。提交前可看到人类可读摘要与模拟结果。",
        close: "关闭",
      },
      createModal: {
        title: "创建智能账户（演示）",
        note:
          "创建时将展示人类可读签名与风险检查。示例地址：",
        cancel: "取消",
        confirm: "确认创建",
      },
      swapModal: {
        title: "跨链兑换（演示）",
        fromChain: "源链",
        toChain: "目标链",
        pay: "支付",
        receive: "获得",
        estOut: "估算输出",
        info:
          "提交前会展示交易路径/费率/滑点/模拟结果与人类可读摘要（演示占位）。",
        cancel: "取消",
        confirm: "确认兑换（演示）",
      },
      features: {
        f1_title: "原生资产",
        f1_tag: "ZetaChain 通用能力",
        f1_desc:
          "通用区块链让资产一次部署即可原生触达多链与比特币",
        f2_title: "AI 代理",
        f2_tag: "Gemini 智慧能力",
        f2_desc:
          "从自然语言直接分析交易意图并进行可靠执行",
        f3_title: "安全可控",
        f3_tag: "ZetaFlow风控能力",
        f3_desc:
          "可扩展的预检与风控规则为资产安全保驾护航",
      },
      toasts: {
        createDemo: "创建钱包仅为前端演示，未发起真实链上事务。",
        swapDemo: "跨链兑换为演示 UI；接入后端/合约即可落地。",
        copied: "已复制到剪贴板",
      },
      msgs: {
        create: (n: string) =>
          `将为你在 ${n || "ZetaChain"} 上创建智能账户（演示）。`,
        swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
          `准备将 ${amt ?? "?"} ${from} 兑换为 ${to}（${s || "?"} → ${d || "?"}）。`,
        balance: (token?: string, chain?: string) =>
          `正在查询 ${chain || "ZetaChain"} 上 ${token || "所有"} 余额（演示）。`,
        fallback:
          "我没完全听懂。你可以试试：创建钱包｜查询余额｜swap 1 ETH to BTC on Bitcoin",
      },
    },
  
    ko: {
      header: {
        cmd: "명령 팔레트 열기",
        tagline: "Build Once, Launch Everywhere — with Gemini.",
        connect: "지갑 연결",
      },
      hero: {
        titlePrefix: "한 문장으로, ",
        titleHighlight: "어디서나 거래",
        byline: "ZetaChain × Gemini로 구동됩니다",
      },
      chat: {
        title: "ZetaFlow Copilot",
        badge: "Gemini 2.5",
        initial: "무엇을 도와드릴까요?",
        placeholder: "예: 내 지갑의 10 ZETA를 현재 시세로 POL로 교환해줘",
        send: "전송",
        parsedAs: "해석 결과:",
      },
      connectModal: {
        title: "지갑 연결",
        metaMask: "MetaMask 연결",
        metaMaskDesc: "브라우저 확장 또는 모바일",
        actionKey: "액션 키 사용",
        actionKeyDesc: "Action Key / Passkey 로그인",
        note:
          "개인키는 저장하지 않습니다. 제출 전 사람에게 읽기 쉬운 요약과 시뮬레이션 결과를 확인할 수 있습니다.",
        close: "닫기",
      },
      createModal: {
        title: "스마트 계정 생성 (데모)",
        note:
          "생성 과정에서 사람이 읽을 수 있는 서명과 리스크 체크를 보여줍니다. 예시 주소:",
        cancel: "취소",
        confirm: "생성 확인",
      },
      swapModal: {
        title: "크로스체인 스왑 (데모)",
        fromChain: "출발 체인",
        toChain: "도착 체인",
        pay: "지불",
        receive: "수령",
        estOut: "예상 수량",
        info:
          "제출 전에 경로/수수료/슬리피지/시뮬레이션과 사람에게 읽기 쉬운 요약을 보여줍니다(데모).",
        cancel: "취소",
        confirm: "스왑 확인(데모)",
      },
      features: {
        f1_title: "네이티브 자산",
        f1_tag: "ZetaChain 범용 기능",
        f1_desc:
          "범용 블록체인은 한 번의 배포로 여러 체인과 비트코인에 네이티브 도달을 가능하게 합니다",
        f2_title: "AI 에이전트",
        f2_tag: "Gemini 인텔리전스",
        f2_desc:
          "자연어에서 거래 의도를 직접 분석하여 신뢰성 있게 실행합니다",
        f3_title: "보안 및 제어 가능",
        f3_tag: "ZetaFlow 리스크 컨트롤",
        f3_desc:
          "확장 가능한 사전 점검과 리스크 규칙으로 자산을 보호합니다",
      },
      toasts: {
        createDemo: "지갑 생성은 데모입니다. 실제 온체인 트랜잭션은 발생하지 않습니다.",
        swapDemo: "크로스체인 스왑은 UI 데모입니다. 백엔드/컨트랙트를 연결하세요.",
        copied: "클립보드에 복사됨",
      },
      msgs: {
        create: (n: string) => `${n || "ZetaChain"} 에 스마트 계정을 생성합니다(데모).`,
        swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
          `${amt ?? "?"} ${from} 를 ${to} 로 스왑 준비 중 (${s || "?"} → ${d || "?"}).`,
        balance: (token?: string, chain?: string) =>
          `${chain || "ZetaChain"} 에서 ${token || "전체"} 잔액 조회(데모).`,
        fallback:
          "잘 이해하지 못했어요. 예: 지갑 생성 | 잔액 조회 | swap 1 ETH to BTC on Bitcoin",
      },
    },
  
    ja: {
      header: {
        cmd: "コマンドパレットを開く",
        tagline: "Build Once, Launch Everywhere — with Gemini.",
        connect: "ウォレット接続",
      },
      hero: {
        titlePrefix: "ひとことで、",
        titleHighlight: "どこでも取引",
        byline: "ZetaChain × Gemini によって駆動",
      },
      chat: {
        title: "ZetaFlow Copilot",
        badge: "Gemini 2.5",
        initial: "本日どのようにお手伝いできますか？",
        placeholder: "例：ウォレットの 10 ZETA を現在の市場価格で POL に交換して",
        send: "送信",
        parsedAs: "解析結果：",
      },
      connectModal: {
        title: "ウォレット接続",
        metaMask: "MetaMask に接続",
        metaMaskDesc: "ブラウザ拡張機能またはモバイル",
        actionKey: "アクションキーを使用",
        actionKeyDesc: "Action Key / Passkey ログイン",
        note:
          "秘密鍵は保存しません。送信前に人間可読の要約とシミュレーション結果を表示します。",
        close: "閉じる",
      },
      createModal: {
        title: "スマートアカウント作成（デモ）",
        note:
          "作成時に人間可読の署名とリスクチェックを表示します。サンプルアドレス：",
        cancel: "キャンセル",
        confirm: "作成を確認",
      },
      swapModal: {
        title: "クロスチェーンスワップ（デモ）",
        fromChain: "送信元チェーン",
        toChain: "送信先チェーン",
        pay: "支払う",
        receive: "受け取る",
        estOut: "推定出力",
        info:
          "送信前にルート/手数料/スリッページ/シミュレーションおよび人間可読の要約を表示します（デモ）。",
        cancel: "キャンセル",
        confirm: "スワップを確認（デモ）",
      },
      features: {
        f1_title: "ネイティブ資産",
        f1_tag: "ZetaChain ユニバーサル機能",
        f1_desc:
          "ユニバーサルなブロックチェーンにより、一度のデプロイで複数チェーンとBitcoinへネイティブ到達",
        f2_title: "AI エージェント",
        f2_tag: "Gemini インテリジェンス",
        f2_desc:
          "自然言語から取引意図を直接解析し、確実に実行します",
        f3_title: "安全で制御可能",
        f3_tag: "ZetaFlow リスク管理",
        f3_desc:
          "拡張可能な事前チェックとリスクルールで資産を保護します",
      },
      toasts: {
        createDemo: "ウォレット作成はデモです。実際のオンチェーントランザクションは行いません。",
        swapDemo: "クロスチェーンスワップはUIデモです。バックエンド/コントラクトを接続してください。",
        copied: "クリップボードにコピーしました",
      },
      msgs: {
        create: (n: string) => `${n || "ZetaChain"} 上にスマートアカウントを作成します（デモ）。`,
        swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
          `${amt ?? "?"} ${from} を ${to} にスワップ準備中（${s || "?"} → ${d || "?"}）。`,
        balance: (token?: string, chain?: string) =>
          `${chain || "ZetaChain"} で ${token || "すべて"} の残高を照会（デモ）。`,
        fallback:
          "うまく理解できませんでした。例：create wallet｜check balance｜swap 1 ETH to BTC on Bitcoin",
      },
    },
  };