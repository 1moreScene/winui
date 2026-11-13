import {expect, test} from '@playwright/test';

test('Segmented projects Rust selection and keyboard focus', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#segmented');
  const calendar = page.getByRole('listbox', {name:'Calendar view', exact:true});
  const day = calendar.getByRole('option', {name:'Day'});
  const week = calendar.getByRole('option', {name:'Week'});
  const month = calendar.getByRole('option', {name:'Month'});
  await expect(day).toHaveAttribute('aria-selected','true');
  const widths = await Promise.all([day,week,month].map(async item => (await item.boundingBox())?.width));
  expect(Math.max(...widths.map(Number))-Math.min(...widths.map(Number))).toBeLessThanOrEqual(1);
  await day.focus();
  await page.keyboard.press('ArrowRight');
  await expect(week).toBeFocused();
  await expect(day).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('Space');
  await expect(week).toHaveAttribute('aria-selected','true');
  await expect(page.getByText('Selected index: 1', {exact:true})).toBeVisible();
  await month.click();
  await expect(month).toHaveAttribute('aria-selected','true');
  await expect(week).toHaveAttribute('aria-selected','false');

  const formats = page.getByRole('listbox', {name:'Button calendar'});
  await expect(formats).toHaveAttribute('aria-multiselectable','true');
  await formats.getByRole('option', {name:'Week'}).click();
  await expect(formats.getByRole('option', {selected:true})).toHaveCount(2);
  await formats.getByRole('option', {name:'Day'}).click();
  await expect(formats.getByRole('option', {selected:true})).toHaveCount(1);

  const details = page.getByRole('listbox', {name:'Sections'}).getByRole('option', {name:'Details'});
  await details.click();
  await expect(details).toHaveAttribute('aria-selected','true');

  const vertical = page.getByRole('listbox', {name:'Vertical calendar'});
  await expect(vertical).toHaveAttribute('aria-orientation','vertical');
  await vertical.getByRole('option', {name:'Day'}).focus();
  await page.keyboard.press('ArrowDown');
  await expect(vertical.getByRole('option', {name:'Month'})).toBeFocused();
  await expect(vertical.getByRole('option', {name:'Week'})).toBeDisabled();
  await page.getByRole('listbox', {name:'Display mode'}).getByRole('option', {name:'Cards'}).click();
  await expect(page.getByText('Card view', {exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
