import { describe, it, expect } from "vitest";
import { appName } from "../src/lib/meta";

describe("smoke", () => {
  it("expõe o nome do app", () => {
    expect(appName()).toBe("radar-congresso");
  });
});
