import ReactDOM from "react-dom/client";
import App from "./App";
import AppWithDevTools from "./AppWithDevTools";
import "./index.css";

// This is set in the dev npm script.
const showDevTools = import.meta.env.REACT_APP_SHOW_DEV_TOOLS === "Y";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  showDevTools ? <AppWithDevTools /> : <App />
);
