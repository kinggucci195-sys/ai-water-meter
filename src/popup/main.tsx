import { createRoot } from "react-dom/client";
import { PopupApp } from "./popup-app";
import "./style.css";

createRoot(document.querySelector("#root")!).render(<PopupApp />);
