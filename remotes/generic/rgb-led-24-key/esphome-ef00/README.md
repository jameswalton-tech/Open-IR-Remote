# Generic 24-key RGB LED remote

All 24 NEC definitions from mxbchr's standalone ESPHome LED project are included. The original YAML, README and GPL v3 licence are preserved in source/. The imported data retains that licence and is not CC0. The source revision is recorded in remote.irr.

Two entries share the source label Remote GREEN, with commands 0xFA05 and 0xEA15. Both names remain unchanged. The second uses color.green.ea15 rather than guessing a corrected name or physical position. Numbered colour IDs follow source names. Receiver-specific RGB values and effect bindings remain in the original YAML rather than being presented as measured commercial-receiver behaviour.

The esphome-nec-16bit profile retains the full source address and command fields, including inverse bits. ESPHome documents both fields as 16-bit values. source_complete means that every source NEC definition is present; transmission requires a compatible parameter mapping. Carrier frequency, duty cycle and repeat behaviour are not measured by this source and are omitted. The 24-button source photo supports the handset description, but physical key-to-code mapping has not been independently tested. Validation status is imported-unverified.

The image is a lossless WebP conversion of the photo linked by the original README, retaining the complete 1000 by 1000 image on white with metadata removed. No handset details were redrawn. Searches found transparent pictures of similar remotes but no better source-specific image. The image is submitted for identification-only review; the original README does not identify its rights holder, and no GPL licence is claimed for the photograph.

Converted on 2026-09-13 with Open IR SDK 0.0.0, build 68ee94f6145f2fbd9c5e31c1dca5ec3de69e1107. No manufacturer model number or universal compatibility is claimed.
