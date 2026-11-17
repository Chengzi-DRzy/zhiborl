from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='D:/WPS Office/WPS Comate/scripts/apps/basic/tools/chromium/versions/1.61.0/chromium-1228/chrome-win64/chrome.exe')
    for width,height in [(1440,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://localhost:61004/',wait_until='networkidle')
        assert page.locator('.sidebar .side-group h2').inner_text()=='直播讯息'
        assert page.locator('.sidebar [data-tab]').count()==2
        assert '上新月历' in page.locator('.sidebar [data-tab="month"]').inner_text()
        assert '直播场次' in page.locator('.sidebar [data-tab="week"]').inner_text()
        assert page.locator('#calendar .day:not(.muted)').count()==30
        assert page.locator('#heroSlots').inner_text()=='71'
        page.locator('[data-tab="week"]').click()
        assert page.locator('#weekList .week-card').count()==7
        assert '主播：' in page.locator('#weekList').inner_text()
        page.screenshot(path=f'C:/Users/ASUS/.wpscomate/workspace/2731151806737271/workbench-week-{width}.png')
        page.locator('#weekNext').click()
        assert page.locator('#weekList .week-card').count()==7
        page.locator('[data-tab="month"]').click()
        assert page.locator('#monthView').is_visible()
        page.screenshot(path=f'C:/Users/ASUS/.wpscomate/workspace/2731151806737271/workbench-month-{width}.png')
        assert not errors,errors
        print(f'{width}px：侧栏、月历30日、周历7卡、翻周与切换通过；页面错误0')
        page.close()
    browser.close()
