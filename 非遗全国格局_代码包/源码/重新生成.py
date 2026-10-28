from pathlib import Path
base=Path(__file__).resolve().parent
html=(base/'index.html').read_text()
for key,name in {'STYLE':'style.css','ECHARTS':'echarts.min.js','DATA':'data.json','GEO':'china_provinces.json','APP':'app.js','INHERITORS':'inheritors.json','INHERITORSAPP':'inheritors.js'}.items():
    text=(base/name).read_text()
    if key!='STYLE': text=text.replace('</script','<\\/script')
    html=html.replace('__'+key+'__',text)
(base.parent/'index.html').write_text(html)
print('已更新网页：',base.parent/'index.html')
