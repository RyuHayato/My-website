import { createRoot } from "react-dom/client";
import "designcodeio/threeui/style.css";
import "./styles/app.css";
import { Scene } from "./Scene";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(<Scene />);
