import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const profile=await mkdtemp(join(tmpdir(),'uav-native-zoom-'));
const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',viewport:{width:1366,height:768},args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],screenshots=[];
const page=await context.newPage();
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function capture(name){await frames();const cdp=await context.newCDPSession(page);const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(`docs/task-ux-screenshots/${name}.png`,Buffer.from(result.data,'base64'));await cdp.detach();screenshots.push(name);}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
try{
 await mkdir('docs/task-ux-screenshots',{recursive:true});
 // Native Chrome Page zoom. A disposable profile keeps the user's browser untouched.
 await page.goto('chrome://settings/appearance');await page.locator('#zoomLevel').selectOption({label:'200%'});
 await page.goto(process.env.UAV_URL??'http://127.0.0.1:4175',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__UAV__&&!window.__UAV__.stats.loading);
 const measured=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale}));
 assert.equal(measured.width,683);assert.equal(measured.height,384);assert.equal(measured.dpr,2);assert.equal(measured.visualScale,1);
 const bundle=await page.locator('script[type=module]').getAttribute('src');await overflow();await capture('native-zoom-200-home');
 await page.getByRole('navigation').getByRole('button',{name:'Luyện tập',exact:true}).click();await page.getByRole('button',{name:'Bỏ qua hướng dẫn',exact:true}).click();
 const candidate=page.getByLabel('Tên hoặc mã học viên',{exact:true});await candidate.focus();await page.keyboard.type('Hoc vien chu lon');assert.equal(await candidate.inputValue(),'Hoc vien chu lon');
 const summary=page.locator('.task-group>summary').filter({hasText:/^Điều kiện bay/});await summary.focus();await page.keyboard.press('Enter');
 const slider=page.getByLabel('Mức gió',{exact:true});await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal(await slider.inputValue(),'1');await page.getByLabel('Mức mưa',{exact:true}).fill('4');await overflow();await capture('native-zoom-200-sliders');
 const prepare=page.getByRole('button',{name:'Chuẩn bị bài bay',exact:true});await prepare.scrollIntoViewIfNeeded();await prepare.focus();await page.keyboard.press('Space');await frames();assert.equal(await page.evaluate(()=>window.__UAV__.session.state),'PREFLIGHT');
 await page.locator('.flight-task').scrollIntoViewIfNeeded();await frames();const dockBounds=await page.locator('.flight-dock').boundingBox();assert.ok(dockBounds.y>=0&&dockBounds.y+dockBounds.height<=384);await overflow();await capture('native-zoom-200-preflight');
 const checkboxes=page.locator('.flight-task input[type=checkbox]');
 for(let i=0;i<await checkboxes.count();i++){await checkboxes.nth(i).focus();await page.keyboard.press('Space');await frames();const box=await checkboxes.nth(i).boundingBox();const bar=await page.locator('.flight-dock').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=bar.y);}
 assert.ok(await page.getByRole('button',{name:'Xác nhận kiểm tra trước bay',exact:true}).isEnabled());await capture('native-zoom-200-checklist-complete');
 const controls=await page.locator('.flight-dock button').evaluateAll(ns=>ns.map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,font:getComputedStyle(n).fontSize})));
 assert.ok(controls.every(n=>n.width>=44&&n.height>=44&&parseFloat(n.font)>=16));
 assert.deepEqual(errors,[]);const checks=['Native Chrome Page zoom 200%: actual683×384 CSS/DPR2 on1366×768 viewport, no pinch scale; keyboard disclosure/input/slider/prepare and preflight/action targets retain functionality without horizontal overflow'];
 await writeFile('docs/native-zoom-browser-evidence.json',JSON.stringify({date:new Date().toISOString(),browser:context.browser()?.version(),bundle,setting:'chrome://settings/appearance #zoomLevel = 2 (200%)',measured,checks,screenshots,controls,errors,limitations:['Automated Chrome only, no real participant or screen-reader audit']},null,2));console.log(JSON.stringify({checks:checks.length,screenshots:screenshots.length,errors}));
}catch(e){await page.screenshot({path:'/tmp/uav-native-zoom-failure.png',fullPage:true});console.error(e);process.exitCode=1;}finally{await context.close();await rm(profile,{recursive:true,force:true});}
