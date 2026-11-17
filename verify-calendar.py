from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='D:/WPS Office/WPS Comate/scripts/apps/basic/tools/chromium/versions/1.61.0/chromium-1228/chrome-win64/chrome.exe')
    for width,height in [(1440,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://localhost:61004/',wait_until='networkidle')
        assert page.locator('#calendar .day:not(.muted)').count()==30
        page.locator('[data-tab="week"]').click()
        assert page.locator('#weekList .week-card').count()==7
        assert page.locator('#weekList').inner_text().count('主播：')>0
        page.locator('#weekNext').click()
        assert page.locator('#weekList .week-card').count()==7
        page.locator('[data-tab="month"]').click()
        assert not page.locator('#monthView').evaluate('(el)=>el.classList.contains("hide")')
        assert not errors,errors
        page.locator('#schedule').scroll_into_view_if_needed()
        page.screenshot(path=f'C:/Users/ASUS/.wpscomate/workspace/2731151806737271/calendar-{width}.png')
        print(f'{width}px: 月历30日、周历7卡、切换及翻周通过；页面错误 {len(errors)}')
        page.close()
    browser.close()
