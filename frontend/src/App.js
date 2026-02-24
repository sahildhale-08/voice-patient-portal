import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [userRole, setUserRole] = useState("Patient");
  const [currentId, setCurrentId] = useState("P001");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setTranscript((finalText) => {
          if (finalText.trim() !== '') submitQuery(finalText);
          return ''; 
        });
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) recognitionRef.current.stop();
    else { setTranscript(''); recognitionRef.current.start(); setIsListening(true); }
  };

  const submitQuery = async (finalText) => {
    if (!finalText) return;

    if (finalText.toLowerCase().includes("activate admin mode")) {
      setUserRole("Admin"); setCurrentId("ADMIN");
      setChatLog(prev => [...prev, { role: 'user', content: finalText }, { role: 'system', content: "Admin Mode Active. Accessing global analytics..." }]);
      return;
    }
    
    if (finalText.toLowerCase().includes("logout")) {
      setUserRole("Patient"); setCurrentId("P001");
      setChatLog(prev => [...prev, { role: 'user', content: finalText }, { role: 'system', content: "Logged out. Switched to P001." }]);
      return;
    }

    setChatLog((prev) => [...prev, { role: 'user', content: finalText }]);

    try {
      const response = await axios.post('http://localhost:5000/api/voice-query', {
        transcript: finalText,
        patientId: currentId
      });

      const results = response.data.data;
      setChatLog((prev) => [...prev, { 
        role: 'system', 
        content: results.length > 0 ? results : "No records found." 
      }]);
    } catch (error) {
      setChatLog((prev) => [...prev, { role: 'system', content: "Error fetching data." }]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-6 flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Medical Portal</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">ID: {currentId}</p>
          </div>
          <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest transition-colors ${
            userRole === 'Admin' ? 'bg-purple-600 text-white' : 'bg-blue-100 text-blue-700'
          }`}>
            {userRole} VIEW
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto mb-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
          {chatLog.length === 0 && (
            <div className="text-slate-400 text-center mt-20 opacity-60">
              <div className="text-5xl mb-4 text-slate-300">🎙️</div>
              {userRole === "Patient" ? "Ask: 'What was my last Vitamin D result?'" : "Ask: 'What is the average Vitamin D level?'"}
            </div>
          )}

          {chatLog.map((msg, idx) => (
            <div key={idx} className={`mb-6 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${
                msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none w-full'
              }`}>
                {msg.role === 'user' ? <p className="font-medium">{msg.content}</p> : (
                  <div className="w-full">
                    {Array.isArray(msg.content) ? (
                      <div className="grid gap-3">
                        {msg.content.map((item, i) => {
                          const keys = Object.keys(item);
                          const displayValue = item.test_value || item.name || item[keys[0]];
                          const label = item.test_name || (userRole === "Admin" ? "Analytics Data" : "Profile Record");
                          
                          return (
                            <div key={i} className="bg-white border border-slate-100 p-4 rounded-xl relative shadow-sm overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1.5 h-full ${userRole === 'Admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
                                {item.status && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.status === 'Low' || item.status === 'High' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.status}</span>}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-800 tracking-tight">{displayValue}</span>
                                <span className="text-sm font-bold text-slate-400">{item.unit || (keys[0].includes('avg') ? 'avg' : keys[0].includes('count') ? 'total' : '')}</span>
                              </div>
                              <div className="mt-3 text-[10px] font-bold text-slate-400 flex justify-between uppercase">
                                <span>REF: {item.test_date || item.patient_id || "SYSTEM"}</span>
                                <span className={userRole === 'Admin' ? 'text-purple-500' : 'text-blue-500'}>{userRole === 'Admin' ? 'Admin Secure ⟡' : 'Verified ●'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-slate-600 italic font-medium">{msg.content}</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {transcript && <div className="flex justify-end mb-4"><span className="p-4 rounded-xl bg-blue-100 text-blue-600 italic border border-blue-200 animate-pulse">{transcript}...</span></div>}
        </div>

        <button onClick={toggleListening} className={`w-full py-5 text-white font-black text-xl rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 ${isListening ? 'bg-red-500 ring-4 ring-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
          {isListening ? "Listening..." : "Tap to Speak"}
        </button>
      </div>
    </div>
  );
};

export default App;