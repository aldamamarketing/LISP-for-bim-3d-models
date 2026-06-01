const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\TM PROJETOS\\.gemini\\antigravity-ide\\brain\\9f844ca5-6484-45e6-a259-01269d6fbb54\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lastHatch = null;
  let lastLibrary = null;

  for await (const line of rl) {
    if (line.includes('"name":"write_to_file"') || line.includes('"name":"replace_file_content"') || line.includes('"name":"multi_replace_file_content"')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.name === 'write_to_file') {
                    if (call.args.TargetFile && call.args.TargetFile.includes('HatchGenerator.jsx')) {
                        lastHatch = call.args.CodeContent;
                    }
                    if (call.args.TargetFile && call.args.TargetFile.includes('LibraryPanel.jsx')) {
                        lastLibrary = call.args.CodeContent;
                    }
                }
            }
        }
      } catch (e) {}
    }
  }

  if (lastHatch) {
      fs.writeFileSync('z:\\Autocad Config\\LISP\\web\\src\\components\\tools\\HatchGenerator.jsx', lastHatch, 'utf8');
      console.log('Restored HatchGenerator.jsx');
  }
  if (lastLibrary) {
      fs.writeFileSync('z:\\Autocad Config\\LISP\\web\\src\\components\\tools\\LibraryPanel.jsx', lastLibrary, 'utf8');
      console.log('Restored LibraryPanel.jsx');
  }
}

processLineByLine();
