import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err)
      return (
        <div className="p-10">
          <p>Something went wrong.</p>
          <button onClick={() => this.setState({ err: null })}>Retry</button>
        </div>
      );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Boundary>
  </React.StrictMode>
);
