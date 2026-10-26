export async function countResponseBlocks(page, selector) {
  return page.locator(selector).count().catch(() => 0);
}

export async function lastVisibleText(page, selector) {
  const loc = page.locator(selector);
  const count = await loc.count().catch(() => 0);
  for (let i = count - 1; i >= 0; i--) {
    const item = loc.nth(i);
    if (await item.isVisible().catch(() => false)) {
      const text = (await item.innerText().catch(() => '')).trim();
      if (text) return text;
    }
  }
  return '';
}

export async function waitForStableResponse(page, {
  selector,
  baselineCount = 0,
  stopSelectors = [],
  timeoutMs = 45_000,
  pollMs = 500,
  stablePolls = 3
}) {
  const started = Date.now();
  let last = '';
  let stable = 0;

  while (Date.now() - started < timeoutMs) {
    await page.waitForTimeout(pollMs);

    const count = await countResponseBlocks(page, selector);
    if (count <= baselineCount) continue;

    const text = await lastVisibleText(page, selector);
    if (!text) continue;

    let generating = false;
    for (const stopSelector of stopSelectors) {
      const stop = page.locator(stopSelector).last();
      if (await stop.isVisible().catch(() => false)) {
        generating = true;
        break;
      }
    }

    if (text === last) stable += 1;
    else {
      last = text;
      stable = 0;
    }

    if (!generating && stable >= stablePolls) {
      return text;
    }
  }

  if (last) return last;
  throw new Error(`Timed out waiting for model response after ${timeoutMs}ms`);
}

export async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const loc = page.locator(selector).last();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click();
      return selector;
    }
  }
  return null;
}
