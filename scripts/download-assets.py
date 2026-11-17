"""Fetch original CC0 PBR maps from Poly Haven. No runtime CDN dependency."""
import json, urllib.request, pathlib, concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]/'public/assets/textures'
def material(asset, name):
    req=urllib.request.Request(f'https://api.polyhaven.com/files/{asset}',headers={'User-Agent':'UAV-Arena/0.1'})
    meta=json.load(urllib.request.urlopen(req,timeout=30))
    for key,suffix in [('Diffuse','color'),('nor_gl','normal'),('Rough','roughness')]:
        entry=meta[key]['2k']['jpg']
        target=root/f'{name}-{suffix}.jpg'
        if not target.exists(): urllib.request.urlretrieve(entry['url'],target)
        print(target.name, target.stat().st_size, flush=True)
with concurrent.futures.ThreadPoolExecutor() as pool:
    list(pool.map(lambda p: material(*p),[('concrete_floor_01','concrete'),('leafy_grass','grass')]))


def grass_model():
    model_root=root.parent/'models'/'grass-medium-01'
    model_root.mkdir(parents=True,exist_ok=True)
    meta=json.load(urllib.request.urlopen(urllib.request.Request('https://api.polyhaven.com/files/grass_medium_01',headers={'User-Agent':'UAV-Arena/0.1'}),timeout=30))
    data=meta['gltf']['1k']['gltf']
    files={'model.gltf':data['url'],**{name:entry['url'] for name,entry in data['include'].items()},'textures/alpha.jpg':meta['Alpha']['1k']['jpg']['url']}
    for name,url in files.items():
        path=model_root/name
        path.resolve().relative_to(model_root.resolve())
        path.parent.mkdir(parents=True,exist_ok=True)
        if not path.exists(): urllib.request.urlretrieve(url,path)
        print(path.relative_to(root.parent),path.stat().st_size,flush=True)
grass_model()
