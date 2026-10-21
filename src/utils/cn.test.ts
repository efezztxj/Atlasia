import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn — clsx + tailwind-merge sarmalı", () => {
  it("düz sınıfları sırayla birleştirir", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("çakışan Tailwind sınıflarında son gelen kazanır", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-red-500", "text-lg")).toBe("text-red-500 text-lg");
  });

  it("koşullu ve yanlış değerleri atlar", () => {
    const showHidden: boolean = false;
    const count = 0;
    expect(cn("base", showHidden && "hidden", undefined, null, count && "x")).toBe("base");
    expect(cn({ active: true, hidden: false })).toBe("active");
    expect(cn(["a", ["b", false]])).toBe("a b");
  });

  it("boş girdide boş dize döner", () => {
    expect(cn()).toBe("");
    expect(cn(undefined, false)).toBe("");
  });
});
