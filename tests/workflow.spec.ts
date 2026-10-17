import { test, expect, type Page } from "@playwright/test";
async function manual(
  page: Page,
  name: string,
  sun: { sign: number; deg: string; min: string },
  moon?: { sign: number; deg: string; min: string },
) {
  await page.getByRole("button", { name: "Добави човек", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Име", { exact: false }).first().fill(name);
  await modal.getByRole("button", { name: "Въведи позиции ръчно" }).click();
  await modal
    .getByRole("combobox", { name: "Слънце: знак", exact: true })
    .selectOption(String(sun.sign));
  await modal
    .getByRole("spinbutton", { name: "Слънце: градуси", exact: true })
    .fill(sun.deg);
  if (sun.min !== "")
    await modal
      .getByRole("spinbutton", { name: "Слънце: минути", exact: true })
      .fill(sun.min);
  if (moon) {
    await modal
      .getByRole("combobox", { name: "Луна: знак", exact: true })
      .selectOption(String(moon.sign));
    await modal
      .getByRole("spinbutton", { name: "Луна: градуси", exact: true })
      .fill(moon.deg);
    await modal
      .getByRole("spinbutton", { name: "Луна: минути", exact: true })
      .fill(moon.min);
  }
  await modal.getByRole("button", { name: "Запази човека" }).click();
  await expect(modal).toBeHidden();
  await page.getByRole("button", { name: "Всички хора", exact: true }).click();
}
test("празна база, ръчни карти, няколко сравнения, редакция и запазване", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Тук започва вашето съзвездие" }),
  ).toBeVisible();
  await manual(
    page,
    "Тест Деси",
    { sign: 11, deg: "29", min: "0" },
    { sign: 4, deg: "0", min: "0" },
  );
  await manual(
    page,
    "Тест Мама",
    { sign: 0, deg: "1", min: "0" },
    { sign: 4, deg: "3", min: "0" },
  );
  await manual(page, "Тест Катя", { sign: 0, deg: "0", min: "" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Тест Деси", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Сравнение", exact: true }).click();
  await page
    .getByLabel("Чия карта разглеждаме?")
    .selectOption({ label: "Тест Деси" });
  await page
    .getByRole("button", { name: "Избери всички", exact: true })
    .click();
  await page.getByRole("button", { name: "Сравни с 2 души" }).click();
  await expect(
    page.getByRole("heading", { name: "Тест Деси × Тест Мама" }),
  ).toBeVisible();
  await expect(page.getByText("2° 00′", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Всички резултати", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(
    page.getByText("Приблизително", { exact: true }).first(),
  ).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV експорт" }).click();
  expect((await dl).suggestedFilename()).toBe("astro-atlas-aspekti.csv");
  await page.getByRole("button", { name: "Хора", exact: true }).click();
  await page.getByRole("button", { name: /Тест Деси/ }).click();
  await page.getByRole("button", { name: "Редактирай" }).click();
  await page
    .getByRole("spinbutton", { name: "Слънце: градуси", exact: true })
    .fill("28");
  await page.getByRole("button", { name: "Запази човека" }).click();
  await page.getByRole("button", { name: "Позиции", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Риби 28° 00′", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Изтрий човека" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Отказ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Тест Деси", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Изтрий човека" }).click();
  await page.getByRole("button", { name: "Да, изтрий човека" }).click();
  await expect(
    page.getByRole("heading", { name: "Тест Деси", exact: true }),
  ).toHaveCount(0);
});
test("реална натална карта, преизчисляване и неизвестен час", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Добави човек", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("Име", { exact: false })
    .first()
    .fill("Изчислителен тест");
  await modal.getByLabel("Дата на раждане").fill("1990-07-15");
  await modal.getByLabel("Местен час").fill("10:30");
  await modal.getByPlaceholder("Потърсете град, напр. София").fill("София");
  await modal.getByRole("button", { name: /София България/ }).click();
  await modal.getByRole("button", { name: "Изчисли и запази" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByLabel("Натална карта", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Позиции", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await expect(
    page.locator("tbody tr").filter({ hasText: "Хирон" }),
  ).not.toContainText("Не е налична");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Домова система по подразбиране").selectOption("W");
  await page.getByRole("button", { name: "Запази настройките" }).click();
  await page.getByRole("button", { name: "Хора", exact: true }).click();
  await page.getByRole("button", { name: /Изчислителен тест/ }).click();
  await expect(
    page.getByText("Картата изисква преизчисление", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Натална карта", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Преизчисли", exact: true }).click();
  await page.getByLabel("Точност на часа").selectOption("unknown");
  await page.getByRole("button", { name: "Изчисли и запази" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByText("Часът е неизвестен.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Позиции", exact: true }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: "Асцендент" }),
  ).toContainText("Не е налична");
  await page.getByRole("button", { name: "Аспекти", exact: true }).click();
  await expect(page.getByText("0 аспекта", { exact: false })).toBeVisible();
});
test("CSV преглед, дубликати и JSON архив", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Импорт", exact: true }).click();
  const csv =
    "Име,Точка,Знак,Градуси,Минути\nИмпорт тест,Луна,Лъв,0,0\nИмпорт тест,Луна,Лъв,1,0\nДруг тест,Луна,Лъв,2,0";
  await page
    .getByRole("dialog")
    .locator("input[type=file]")
    .setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await page.getByRole("button", { name: "Преглед", exact: true }).click();
  await expect(
    page.getByText("3 валидни реда", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Импортирай позициите" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: /Импорт тест/ }).click();
  await page.getByRole("button", { name: "Позиции", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Лъв 0° 00′", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Повторения", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Луна в Лъв" })).toBeVisible();
  await page.getByRole("button", { name: "Съвпад по градуси" }).click();
  await expect(
    page.getByRole("cell", { name: "2° 00′", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Изтегли JSON архив" }).click();
  expect((await wait).suggestedFilename()).toBe("astro-atlas-arhiv.json");
});
test("мобилна навигация, форма и липса на хоризонтално преливане", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Вашите хора", level: 1 }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Отвори навигацията" }).click();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Настройки", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Добави човек", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Въведи позиции ръчно" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
test("JSON възстановяване след преглед и отказ при невалидни данни", async ({
  page,
}) => {
  await page.goto("/");
  await manual(page, "Архив тест", { sign: 0, deg: "0", min: "0" });
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Изтегли JSON архив" }).click();
  const dl = await downloadEvent;
  const stream = await dl.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const archive = JSON.parse(Buffer.concat(chunks).toString());
  archive.people[0].name = "Възстановено име";
  archive.people[0].overrides[0].longitude = 0.123456789;
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "restore.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(archive)),
    });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Замести с данните от архива" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Хора", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Възстановено име", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Възстановено име/ }).click();
  await page.getByRole("button", { name: "Редактирай" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Име", { exact: false })
    .first()
    .fill("Възстановено име");
  await page.getByRole("button", { name: "Запази човека" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("astro-atlas-local-v1")!).people[0]
          .overrides[0].longitude,
    ),
  ).toBe(0.123456789);
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":5}'),
    });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Хора", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Възстановено име", exact: true }),
  ).toBeVisible();
});
