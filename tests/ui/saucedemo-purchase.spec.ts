import { test, expect } from '@playwright/test';
import { LoginPage, ProductsPage, CartPage, CheckoutCustomerInfoPage, CheckoutOverviewPage } from '../../internals';

function randomString(length = 6) {
	const chars = 'abcdefghijklmnopqrstuvwxyz';
	let out = '';
	for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
	return out;
}

test('adding single product to cart', { tag: ['@ui', '@regression'] }, async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');
    const productName: string = 'Sauce Labs Bike Light';
    let products: ProductsPage;
    let cart: CartPage;
    let customer: CheckoutCustomerInfoPage;
    let overview: CheckoutOverviewPage ;

    const username: string = 'standard_user';
    const password: string = 'secret_sauce';
    
    await test.step(`Given the user is logged in to the system with user ${username} and password ${password}`, async () => {
        const login = new LoginPage(page);
        await login.fillUsername(username);
        await login.fillPassword(password);
        products = await login.clickLoginButton();
    });
    await test.step(`And the user is adding product ${productName} to the cart`, async () => {
        await products.addProductToCart(productName);
    });

    await test.step(`And the product ${productName} is added to the cart`, async () => {
        cart = await products.goToCart();
        const listOfProducts: string[] = await cart.getProductNames();
        expect(listOfProducts).toContain(productName);
        
    });

    await test.step(`And the user is filling customer information`, async () => {
        customer = await cart.clickCheckout();
        const firstName = `fn-${randomString(5)}`;
		const lastName = `ln-${randomString(5)}`;
		const postal = `${Math.floor(10000 + Math.random() * 89999)}`;
        await customer.fillFirstName(firstName);
        await customer.fillLastName(lastName);
        await customer.fillPostalCode(postal);
        overview = await customer.clickContinue();

    });

    await test.step('Then all products are visible in the overview page', async () => {
        const listOfProducts: string[] = await overview.getProductNames();
        expect(listOfProducts).toContain(productName);
        await overview.clickFinish();
        await overview.backToProducts();
    });

    
});

