# Build 009 - Media Assets

## City Videos
All city videos are from **Pexels** (free to use, no attribution required)

1. **city_skyline_timelapse.mp4** (6.6 MB)
   - Source: https://www.pexels.com/video/1824697/
   - Description: Golden Gate Bridge at San Francisco
   - Resolution: 1920x1080 HD
   - FPS: 30fps

2. **city_night_lights.mp4** (13 MB)
   - Source: https://www.pexels.com/video/2099536/
   - Description: Nightlife in the city
   - Resolution: 1920x1080 HD
   - FPS: 30fps

3. **city_timelapse_traffic.mp4** (3.4 MB)
   - Source: https://www.pexels.com/video/1654216/
   - Description: View of city in timelapse mode
   - Resolution: 1920x1080 HD
   - FPS: 30fps

## Oasis/Desert Videos
All oasis videos are from **Pixabay** (free to use under Pixabay License)

1. **desert_dunes.mp4** (18 MB)
   - Source: https://pixabay.com/videos/desert-sand-dunes-dry-travel-92837/
   - Description: Desert sand dunes with clouds
   - Resolution: 4K
   - Duration: 7 seconds

2. **waterfall_oasis.mp4** (34 MB)
   - Source: https://pixabay.com/videos/waterfall-rocks-landscape-nature-67605/
   - Description: Ladies Bath Falls, Mount Buffalo National Park, Victoria, Australia
   - Resolution: HD
   - Duration: 59 seconds

3. **green_field_oasis.mp4** (51 MB)
   - Source: https://pixabay.com/videos/field-oasis-tillage-green-earth-117077/
   - Description: Green field oasis from aerial view
   - Resolution: 4K
   - FPS: 18fps

## License Information

### Pexels License
- Free to use for commercial and non-commercial purposes
- No attribution required (but appreciated)
- Cannot sell or distribute as-is on other stock photo/video sites
- Full license: https://www.pexels.com/license/

### Pixabay License
- Free for commercial use
- No attribution required
- Full license: https://pixabay.com/service/license/

## Usage in Build 009

These assets are used in the clean vertical webpage with scroll-triggered media playback. Each video placeholder in `index.html` can reference these files using relative paths like:

```html
<video autoplay muted loop>
  <source src="assets/city/city_skyline_timelapse.mp4" type="video/mp4">
</video>
```
