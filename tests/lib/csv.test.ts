import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvObjetos } from "../../src/lib/csv";

describe("parseCsv", () => {
  it("respeita delimitador dentro de campo entre aspas", () => {
    const r = parseCsv('a;b;c\n"1";"tem ; ponto e vírgula";"3"');
    expect(r).toEqual([
      ["a", "b", "c"],
      ["1", "tem ; ponto e vírgula", "3"],
    ]);
  });

  it("trata aspas escapadas ('') dentro do campo", () => {
    const r = parseCsv('x\n"ele disse ""oi"" pra mim"');
    expect(r[1][0]).toBe('ele disse "oi" pra mim');
  });

  it("respeita quebra de linha dentro de aspas", () => {
    const r = parseCsv('x;y\n"linha1\nlinha2";fim');
    expect(r).toHaveLength(2);
    expect(r[1][0]).toBe("linha1\nlinha2");
    expect(r[1][1]).toBe("fim");
  });

  it("remove BOM e ignora \\r do \\r\\n", () => {
    const r = parseCsv("﻿a;b\r\n1;2\r\n");
    expect(r).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parseCsvObjetos usa o cabeçalho como chaves", () => {
    const r = parseCsvObjetos('nome;uf\n"Fulano";"SP"');
    expect(r).toEqual([{ nome: "Fulano", uf: "SP" }]);
  });
});
