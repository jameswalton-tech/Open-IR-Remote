---
name: Add or update a remote
about: Submit one physical remote or related variant family
---

## Remote

- Remote name:
- Manufacturer:
- Model / printed number:
- Variant / region:
- Controlled device tested:

## Source and testing

- [ ] I recorded these signals myself or identified the source and redistribution licence.
- [ ] I recorded the carrier frequency or marked it unknown.
- [ ] I recorded the protocol or marked it unknown without guessing.
- [ ] I tested the claimed commands on the identified device.
- Test equipment and method:
- Test date:

## Image rights

- [ ] No image is included.
- [ ] The included `remote.webp` meets the size/background rules and I have stated its holder, source and rights basis.
- [ ] I understand that remote images remain the property of their respective copyright holders and are used only for identification.

## Checks

- [ ] `python tools/validate.py` passes.
- [ ] `python tools/build_api.py --check` passes after regenerating the API.
- [ ] I searched for an existing matching remote or duplicate signals.
- [ ] The PR changes one remote or one closely related variant family.
