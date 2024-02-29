import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [conn_state, set_conn_state] = useState('Connecting to server ...');
  const conn_server = async () => {
    try {
      const res = await fetch('http://localhost:8035');
      if (res.ok) {
        const status: Record<string, string> = await res.json();
        set_conn_state(status.message);
      }
    } catch (err) {
      set_conn_state('Unable to connect to server');
    }
  };
  useEffect(() => {
    conn_server().catch(console.dir);
  }, []);
  return (
    <>
      <h1>SQL Platform</h1>
      <div>{conn_state}</div>
      <button
        onClick={() => {
          set_conn_state('Connecting to server ...');
          conn_server().catch(console.dir);
        }}>
        Retry
      </button>
    </>
  );
}

export default App;
