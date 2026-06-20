import { test, expect } from '@playwright/test';

test('saucedemo checkout flow', async ({ page }) => {
  // Step 1: Navigate to the site
  await page.goto('https://www.saucedemo.com/');

  // Step 2: Login
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();

  // Step 3: Verify inventory page
  await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');
  await expect(page.locator('[data-test="title"]')).toHaveText('Products');

  // Step 4: Sort by price low to high
  await page.locator('[data-test="product-sort-container"]').selectOption('Price (low to high)');

  // Step 5: Add Onesie ($7.99) to cart
  await page.locator('[data-test="add-to-cart-sauce-labs-onesie"]').click();

  // Step 6: Add Backpack ($29.99) to cart
  await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();

  // Step 7: Verify cart badge shows 2
  await expect(page.locator('[data-test="shopping-cart-badge"]')).toHaveText('2');

  // Step 8: Navigate to cart
  await page.locator('[data-test="shopping-cart-link"]').click();
  await expect(page).toHaveURL('https://www.saucedemo.com/cart.html');

  // Step 9: Verify 2 items in cart
  await expect(page.locator('[data-test="inventory-item-name"]')).toHaveCount(2);

  // Step 10: Proceed to checkout
  await page.locator('[data-test="checkout"]').click();
  await expect(page).toHaveURL('https://www.saucedemo.com/checkout-step-one.html');

  // Step 11: Fill in customer information
  await page.locator('[data-test="firstName"]').fill('John');
  await page.locator('[data-test="lastName"]').fill('Doe');
  await page.locator('[data-test="postalCode"]').fill('12345');
  await page.locator('[data-test="continue"]').click();

  // Step 12: Verify order summary — Onesie $7.99 + Backpack $29.99 = $37.98
  await expect(page).toHaveURL('https://www.saucedemo.com/checkout-step-two.html');
  await expect(page.locator('[data-test="subtotal-label"]')).toContainText('$37.98');

  // Step 13: Finish the order
  await page.locator('[data-test="finish"]').click();

  // Step 14: Verify order confirmation
  await expect(page).toHaveURL('https://www.saucedemo.com/checkout-complete.html');
  await expect(page.locator('[data-test="complete-header"]')).toHaveText('Thank you for your order!');
});
