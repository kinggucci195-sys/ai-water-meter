import { createRoot } from "react-dom/client";
import { OptionsApp } from "./options-app";
import "./style.css";

createRoot(document.querySelector("#root")!).render(<OptionsApp />);
