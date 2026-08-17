/**
 * Parser de CSV que respeita aspas — ao contrário de um `split(";")` ingênuo,
 * lida com delimitadores e quebras de linha DENTRO de campos entre aspas, e com
 * aspas escapadas (`""`). Necessário porque os arquivos da Câmara têm descrições
 * longas com `;`, `,`, aspas e quebras embutidas.
 */
export function parseCsv(texto: string, delim = ";"): string[][] {
  const s = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto; // tira BOM
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dentroAspas) {
      if (c === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; } // aspas escapada ""
        else dentroAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === delim) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      campo = "";
      linhas.push(linha);
      linha = [];
    } else if (c !== "\r") {
      campo += c;
    }
  }
  // último campo/linha (arquivo pode não terminar em \n)
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

/** Como `parseCsv`, mas devolve objetos usando a primeira linha como cabeçalho. */
export function parseCsvObjetos(texto: string, delim = ";"): Record<string, string>[] {
  const linhas = parseCsv(texto, delim);
  if (linhas.length === 0) return [];
  const header = linhas[0];
  return linhas.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = r[i] ?? ""));
    return o;
  });
}
