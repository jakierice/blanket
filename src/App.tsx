import React from "react";
import { AccountsPage } from "./AccountsPage";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <AccountsPage />
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
