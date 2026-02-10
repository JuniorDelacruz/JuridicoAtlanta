import fs from "node:fs";
import path from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";

const distDir = path.resolve("dist/assets");

// pega só .js (evita .css, .map etc)
const files = fs.readdirSync(distDir).filter(f => f.endsWith(".js"));

for (const file of files) {
  const filePath = path.join(distDir, file);
  const code = fs.readFileSync(filePath, "utf8");

  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false, // deixa false pra não virar bomba de performance
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,         // mantém false pra reduzir chance de quebrar libs
    stringArray: true,
    stringArrayThreshold: 0.7,
    splitStrings: false,
    selfDefending: false
  }).getObfuscatedCode();

  fs.writeFileSync(filePath, obfuscated, "utf8");
  console.log("Obfuscated:", file);
}

console.log("Done.");
