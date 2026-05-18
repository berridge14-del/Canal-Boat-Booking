"$file = '$PWD\index.html'
$content = Get-Content $file -Raw

# 1. LOADER TRANSITION - Seamless cinematic fade
$old1 = '#loader{position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;transition:opacity .8s var(--ease), visibility .8s;}'
$new1 = '#loader{position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;transition:opacity 1.4s cubic-bezier(.4,0,.2,1),visibility 1.4s,transform 1.2s cubic-bezier(.4,0,.2,1);}#loader.out{opacity:0;visibility:hidden;pointer-events:none;}#loader.out .loader-inner{transform:scale(1.1) translateY(-30px);opacity:0;}'
$content = $content -replace [regex]::Escape($old1), $new1

# 2. REDUCED LOGO SIZE
$old2 = '.logo-mark{width:104px;height:122px;color:var(--gold-light);flex-shrink:0;}'
$new2 = '.logo-mark{width:58px;height:68px;color:var(--gold-light);flex-shrink:0;transition:width .4s var(--ease),height .4s var(--ease);}nav.solid .logo-mark{width:46px;height:54px;}'
$content = $content -replace [regex]::Escape($old2), $new2

$old2b = '.logo-text-rest,.logo-text-roam{font-family:Montserrat,sans-serif;font-size:2.8rem;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-light);}'
$new2b = '.logo-text-rest,.logo-text-roam{font-family:Montserrat,sans-serif;font-size:1.5rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-light);transition:font-size .4s var(--ease);}nav.solid .logo-text-rest,nav.solid .logo-text-roam{font-size:1.2rem;}'
$content = $content -replace [regex]::Escape($old2b), $new2b

# 3. ADD HERO BODY FADE-IN FOR LOADER TRANSITION
$old3 = '.hero-body{position:relative;z-index:5;width:100%;max-width:1320px;margin:auto;padding:0 6% 100px;}'
$new3 = '.hero-body{position:relative;z-index:5;width:100%;max-width:1320px;margin:auto;padding:0 6% 100px;opacity:0;transform:translateY(40px);transition:opacity 1s var(--ease) .2s,transform 1s var(--ease) .2s;}.hero-body.ready{opacity:1;transform:none;}'
$content = $content -replace [regex]::Escape($old3), $new3

# 4. UPDATE LOADER JS TIMING
$old4 = "setTimeout\(\)=>\{document\.getElementById\('loader'\)\.classList\.add\('out'\);\},2900\);"
$new4 = "setTimeout(()=>{document.getElementById('heroBody').classList.add('ready');},2400);setTimeout(()=>{document.getElementById('loader').classList.add('out');},3200);"
$content = $content -replace $old4, $new4

# 5. ADD CALENDAR UNAVAILABLE STYLING
$calStyle = '.calendar-day.is-unavailable{background:rgba(100,60,40,.12)!important;color:rgba(245,240,230,.25)!important;cursor:not-allowed;border-color:rgba(100,60,40,.2)!important;pointer-events:none;}.calendar-day.is-unavailable::before{content:"";position:absolute;top:50%;left:50%;width:60%;height:1px;background:rgba(100,60,40,.35);transform:translate(-50%,-50%) rotate(-45deg);}'
$content = $content -insert ($content.Length - 100), $calStyle

Set-Content -Path $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'Step 1-5 applied'
