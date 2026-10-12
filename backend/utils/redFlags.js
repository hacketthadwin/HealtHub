// Deterministic emergency screening. Runs BEFORE any model call so a life-threatening message is
// never answered with a generic tip list.
const NEGATION = /\b(no|not|without|never|don'?t have|do not have|denies|free of)\b[^.!?\n]{0,25}$/i;

const EMERGENCY_PATTERNS = [
  { label: "chest pain",           re: /chest\s+(pain|pressure|tightness)|heart\s+attack/i },
  { label: "breathing difficulty", re: /(can'?t|cannot|unable to)\s+breathe|difficulty\s+breathing|severe\s+shortness\s+of\s+breath|gasping/i },
  { label: "stroke signs",         re: /face\s+droop|slurred\s+speech|sudden\s+(weakness|numbness)|one[-\s]sided\s+weakness|sudden\s+(loss\s+of\s+vision|confusion)|\bstroke\b/i },
  { label: "severe bleeding",      re: /(heavy|severe|uncontrolled)\s+bleeding|bleeding\s+(won'?t|will not|that won'?t)\s+stop|vomit(ing)?\s+blood|coughing\s+(up\s+)?blood/i },
  { label: "seizure",              re: /\bseizure|convulsion/i },
  { label: "loss of consciousness",re: /unconscious|passed\s+out|not\s+responding|unresponsive|fainted/i },
  { label: "poisoning / overdose", re: /overdos|poison(ed|ing)|swallowed\s+(bleach|pesticide|acid)/i },
  { label: "severe allergic reaction", re: /anaphyla|throat\s+(is\s+)?swelling|swelling\s+of\s+(the\s+)?(throat|tongue|lips)/i },
  { label: "pregnancy emergency",  re: /pregnan\w*[^.!?\n]{0,40}(heavy\s+bleeding|severe\s+(pain|cramps))|(heavy\s+bleeding|severe\s+(pain|cramps))[^.!?\n]{0,40}pregnan/i },
];

const SELF_HARM_PATTERNS = [
  { label: "self-harm / suicidal thoughts", re: /suicid|kill\s+myself|end\s+my\s+life|want\s+to\s+die|self[-\s]?harm|hurt\s+myself|don'?t\s+want\s+to\s+live/i },
];

function scan(text, patterns) {
  const hits = [];
  const source = String(text || "");
  for (const { label, re } of patterns) {
    const g = new RegExp(re.source, "gi");
    let m;
    while ((m = g.exec(source)) !== null) {
      const before = source.slice(Math.max(0, m.index - 30), m.index);
      if (!NEGATION.test(before)) { hits.push(label); break; }
    }
  }
  return hits;
}

function detectRedFlags(text) {
  return {
    emergency: scan(text, EMERGENCY_PATTERNS),
    selfHarm:  scan(text, SELF_HARM_PATTERNS),
  };
}

const EMERGENCY_REPLY_HTML =
  "<h4>Answer:</h4><ul>" +
  "<li>What you describe can be a <strong>medical emergency</strong>. Please do not wait for an online reply.</li>" +
  "<li>Call <strong>112</strong> (India's emergency number) or <strong>108</strong> for an ambulance, or go to the nearest emergency department now.</li>" +
  "</ul><h4>Do these things:</h4><ul>" +
  "<li>Call for help now and stay with the person if it is someone else.</li>" +
  "<li>Do not drive yourself if you feel faint, dizzy or unwell.</li>" +
  "<li>Tell the responders your symptoms and any medicines or allergies.</li></ul>";

const SELF_HARM_REPLY_HTML =
  "<h4>Answer:</h4><ul>" +
  "<li>I'm really sorry you are going through this. You deserve support right now, and you do not have to handle it alone.</li>" +
  "<li>If you might act on these thoughts, call <strong>112</strong> now or go to the nearest emergency department.</li>" +
  "</ul><h4>Do these things:</h4><ul>" +
  "<li>Call <strong>Tele-MANAS: 14416</strong> (free, 24x7, many languages) to talk to a trained counsellor.</li>" +
  "<li>Tell someone you trust where you are and how you feel, and stay near other people.</li>" +
  "<li>Move away from anything you could use to hurt yourself.</li></ul>";

module.exports = { detectRedFlags, EMERGENCY_REPLY_HTML, SELF_HARM_REPLY_HTML };