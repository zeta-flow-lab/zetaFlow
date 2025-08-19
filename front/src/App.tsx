import './App.css'
import ZetaFlow from "./pages/trade/trade";
// 临时：测试页路由（简单切换）
import OutboundTestPage from "./pages/test/outbound";


function App() {
  const useTest = typeof window !== 'undefined' && window.location.hash === '#/test';
  return useTest ? <OutboundTestPage /> : <ZetaFlow />
}

export default App
