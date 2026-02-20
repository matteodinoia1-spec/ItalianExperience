#!/bin/bash

find assets/img -type f -name "*.jpg" -size +250k | while read img; do

  width=$(vipsheader -f width "$img")
  scale1280=$(echo "scale=5; 1280 / $width" | bc)
  scale1920=$(echo "scale=5; 1920 / $width" | bc)
  scale2560=$(echo "scale=5; 2560 / $width" | bc)

  base="${img%.jpg}"

  echo "Processing $img"

  if (( $(echo "$width > 1280" | bc -l) )); then
    vips resize "$img" "$base-1280-temp.jpg" "$scale1280"
    vips heifsave "$base-1280-temp.jpg" "$base-1280.avif" --Q 32 --compression av1
    rm "$base-1280-temp.jpg"
  fi

  if (( $(echo "$width > 1920" | bc -l) )); then
    vips resize "$img" "$base-1920-temp.jpg" "$scale1920"
    vips heifsave "$base-1920-temp.jpg" "$base-1920.avif" --Q 32 --compression av1
    rm "$base-1920-temp.jpg"
  fi

  if (( $(echo "$width > 2560" | bc -l) )); then
    vips resize "$img" "$base-2560-temp.jpg" "$scale2560"
    vips heifsave "$base-2560-temp.jpg" "$base-2560.avif" --Q 32 --compression av1
    rm "$base-2560-temp.jpg"
  fi

done

echo "Done."

