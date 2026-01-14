#!/bin/bash
# Create sound effects for the OneShotCoding launch video
# Timeline:
# 0.0s - Scene 1: Terminal typing
# 4.5s - Flash + Scene 2: Big "1" slam
# 7.5s - Flash + Scene 3: Rules slide in
# 11.5s - Flash + Scene 4: Cards pop
# 16.0s - Flash + Scene 5: Final logo reveal

cd "$(dirname "$0")"

# Ambient low drone/pad (throughout video)
ffmpeg -y -f lavfi -i "sine=frequency=55:duration=20.5" \
  -af "volume=0.08,lowpass=f=100,afade=t=in:st=0:d=1,afade=t=out:st=19:d=1.5" \
  ambient_drone.wav 2>/dev/null

# Typing clicks (0.8s - 3.3s, rapid soft clicks)
ffmpeg -y -f lavfi -i "anoisesrc=d=0.02:c=white:a=0.3" -af "highpass=f=2000" click_single.wav 2>/dev/null

# Create typing sequence (roughly 50 characters over 2.5 seconds)
typing_filter=""
for i in $(seq 0 49); do
  delay=$(echo "scale=3; 0.8 + $i * 0.05" | bc)
  typing_filter="${typing_filter}[click];[click]adelay=${delay}s:all=1"
done

# Simpler approach: Generate typing sound as filtered noise bursts - LOUDER
ffmpeg -y -f lavfi -i "anoisesrc=d=2.5:c=pink:a=0.6" \
  -af "highpass=f=2000,lowpass=f=10000,tremolo=f=18:d=0.95,volume=1.5" \
  typing.wav 2>/dev/null

# Whoosh/transition sounds for scene changes
# Whoosh 1 at 4.45s
ffmpeg -y -f lavfi -i "anoisesrc=d=0.3:c=pink:a=0.5" \
  -af "highpass=f=200,lowpass=f=4000,afade=t=in:st=0:d=0.05,afade=t=out:st=0.1:d=0.2,volume=0.6" \
  whoosh.wav 2>/dev/null

# Impact/slam sound for "1" appearing (deep thud)
ffmpeg -y -f lavfi -i "sine=frequency=60:duration=0.4" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.05:d=0.35,volume=0.7" \
  impact_low.wav 2>/dev/null

# Higher impact for slam
ffmpeg -y -f lavfi -i "sine=frequency=120:duration=0.3" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.03:d=0.27,volume=0.4" \
  impact_mid.wav 2>/dev/null

# Slide/swoosh for rules appearing
ffmpeg -y -f lavfi -i "anoisesrc=d=0.25:c=brown:a=0.3" \
  -af "highpass=f=100,lowpass=f=2000,afade=t=in:st=0:d=0.05,afade=t=out:st=0.1:d=0.15,volume=0.5" \
  slide.wav 2>/dev/null

# Pop sound for cards
ffmpeg -y -f lavfi -i "sine=frequency=800:duration=0.15" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.02:d=0.13,volume=0.25" \
  pop.wav 2>/dev/null

# Shimmer/reveal for final logo
ffmpeg -y -f lavfi -i "anoisesrc=d=0.8:c=white:a=0.2" \
  -af "highpass=f=4000,lowpass=f=12000,afade=t=in:st=0:d=0.2,afade=t=out:st=0.3:d=0.5,volume=0.3" \
  shimmer.wav 2>/dev/null

# Rising tone for final reveal
ffmpeg -y -f lavfi -i "aevalsrc=sin(2*PI*t*(200+t*100)):d=1.0" \
  -af "afade=t=in:st=0:d=0.3,afade=t=out:st=0.5:d=0.5,volume=0.2" \
  rise.wav 2>/dev/null

# Now combine all sounds with proper timing
# Using amix to layer all sounds

ffmpeg -y \
  -i ambient_drone.wav \
  -i typing.wav \
  -i whoosh.wav \
  -i impact_low.wav \
  -i impact_mid.wav \
  -i slide.wav \
  -i slide.wav \
  -i slide.wav \
  -i whoosh.wav \
  -i pop.wav \
  -i pop.wav \
  -i pop.wav \
  -i whoosh.wav \
  -i shimmer.wav \
  -i rise.wav \
  -filter_complex "
    [0]adelay=0|0[drone];
    [1]adelay=800|800[typing];
    [2]adelay=4450|4450[whoosh1];
    [3]adelay=4500|4500[impact1];
    [4]adelay=4500|4500[impact1b];
    [5]adelay=7700|7700[slide1];
    [6]adelay=8300|8300[slide2];
    [7]adelay=8900|8900[slide3];
    [8]adelay=11450|11450[whoosh2];
    [9]adelay=12000|12000[pop1];
    [10]adelay=12300|12300[pop2];
    [11]adelay=12600|12600[pop3];
    [12]adelay=15950|15950[whoosh3];
    [13]adelay=16100|16100[shimmer];
    [14]adelay=16500|16500[rise];
    [drone][typing][whoosh1][impact1][impact1b][slide1][slide2][slide3][whoosh2][pop1][pop2][pop3][whoosh3][shimmer][rise]amix=inputs=15:duration=longest:dropout_transition=0,volume=2.0
  " \
  audio_track.wav 2>/dev/null

echo "Audio track created: audio_track.wav"

# Cleanup temp files
rm -f ambient_drone.wav typing.wav whoosh.wav impact_low.wav impact_mid.wav slide.wav pop.wav shimmer.wav rise.wav click_single.wav

echo "Done!"
