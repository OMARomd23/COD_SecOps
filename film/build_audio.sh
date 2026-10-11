#!/usr/bin/env bash
# Procedural cinematic sound design for CALL OF DUTY: SEC OPS
# All synthesized with ffmpeg — no external samples.
set -e
cd "$(dirname "$0")"
D=/tmp/cod_audio; mkdir -p "$D"; rm -f "$D"/*.wav
SR=48000
AF="-ar $SR -ac 2"

# ---- low ominous drone for the whole piece (two detuned sines + slow LFO) ----
ffmpeg -y -f lavfi -i "aevalsrc=\
0.16*sin(2*PI*55*t)*(0.7+0.3*sin(2*PI*0.12*t)) + \
0.12*sin(2*PI*82.4*t) + \
0.07*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.2*t)):d=28.5:s=$SR" \
 -af "highpass=f=30,lowpass=f=320,volume=0.9,aformat=channel_layouts=stereo" $AF "$D/drone.wav" -loglevel error

# ---- alarm two-tone during cold open (0.0 - 3.3), gated ----
ffmpeg -y -f lavfi -i "aevalsrc=\
(0.22*sin(2*PI*620*t)+0.15*sin(2*PI*930*t))*(lt(mod(t\,0.9)\,0.45)):d=3.3:s=$SR" \
 -af "volume=0.5,tremolo=f=8:d=0.3,highpass=f=300,aformat=channel_layouts=stereo" $AF "$D/alarm.wav" -loglevel error

# ---- impact boom generator: $1=outfile $2=pitch ----
boom(){ ffmpeg -y -f lavfi -i "aevalsrc=\
exp(-t*6)*(0.9*sin(2*PI*$2*t)+0.5*sin(2*PI*($2*0.5)*t)) + exp(-t*28)*0.6*(random(0)-0.5):d=1.2:s=$SR" \
 -af "lowpass=f=1800,volume=1.0,aformat=channel_layouts=stereo" $AF "$1" -loglevel error; }
boom "$D/b1.wav" 70
boom "$D/b2.wav" 62
boom "$D/b3.wav" 80
boom "$D/b4.wav" 58
boom "$D/b5.wav" 90
boom "$D/bhack.wav" 75
boom "$D/bchaos.wav" 55
boom "$D/btitle.wav" 46

# ---- whoosh (noise sweep) for entrances ----
ffmpeg -y -f lavfi -i "aevalsrc=exp(-t*5)*0.5*(random(0)-0.5):d=0.9:s=$SR" \
 -af "highpass=f=200,lowpass=f=4500,volume=0.8,aformat=channel_layouts=stereo" $AF "$D/whoosh.wav" -loglevel error

# ---- typing bed during hack (17.5-22.8): fast gated clicks ----
ffmpeg -y -f lavfi -i "aevalsrc=\
exp(-mod(t\,0.085)*55)*0.4*(random(0)-0.5):d=5.3:s=$SR" \
 -af "highpass=f=900,lowpass=f=5000,volume=0.6,aformat=channel_layouts=stereo" $AF "$D/type.wav" -loglevel error

# ---- data/beep arpeggio during hack ----
ffmpeg -y -f lavfi -i "aevalsrc=\
0.12*sin(2*PI*(660+220*floor(mod(t*4\,4)))*t)*(lt(mod(t\,0.25)\,0.12)):d=5.3:s=$SR" \
 -af "volume=0.5,highpass=f=400,aformat=channel_layouts=stereo" $AF "$D/beeps.wav" -loglevel error

# ---- riser into the title (23.4 - 25.4): rising tone + noise ----
ffmpeg -y -f lavfi -i "aevalsrc=\
(0.18*sin(2*PI*(180+620*t/2)*t) + 0.12*(random(0)-0.5))*(t/2):d=2.0:s=$SR" \
 -af "highpass=f=120,volume=1.0,afade=t=in:st=0:d=1.6,aformat=channel_layouts=stereo" $AF "$D/riser.wav" -loglevel error

# ---- title synth stab / chord at 25.4 (power chord-ish) ----
ffmpeg -y -f lavfi -i "aevalsrc=\
exp(-t*1.4)*(0.18*sin(2*PI*110*t)+0.16*sin(2*PI*164.8*t)+0.12*sin(2*PI*220*t)+0.08*sin(2*PI*329.6*t)):d=3.1:s=$SR" \
 -af "lowpass=f=4000,volume=1.0,afade=t=out:st=2.4:d=0.7,aformat=channel_layouts=stereo" $AF "$D/chord.wav" -loglevel error

# ---- heartbeat sub pulses during chaos (22.8-25.4) ----
ffmpeg -y -f lavfi -i "aevalsrc=\
exp(-mod(t\,0.6)*9)*0.5*sin(2*PI*48*t):d=2.6:s=$SR" \
 -af "lowpass=f=160,volume=1.0,aformat=channel_layouts=stereo" $AF "$D/heart.wav" -loglevel error

# ============ MIX with delays (ms) ============
ffmpeg -y \
 -i "$D/drone.wav" -i "$D/alarm.wav" \
 -i "$D/b1.wav" -i "$D/b2.wav" -i "$D/b3.wav" -i "$D/b4.wav" -i "$D/b5.wav" \
 -i "$D/whoosh.wav" -i "$D/bhack.wav" -i "$D/type.wav" -i "$D/beeps.wav" \
 -i "$D/bchaos.wav" -i "$D/heart.wav" -i "$D/riser.wav" -i "$D/btitle.wav" -i "$D/chord.wav" \
 -filter_complex "\
[1:a]adelay=0|0[a1];\
[2:a]adelay=3300|3300[a2];\
[3:a]adelay=6100|6100[a3];\
[4:a]adelay=8900|8900[a4];\
[5:a]adelay=11700|11700[a5];\
[6:a]adelay=14500|14500[a6];\
[7:a]adelay=3200|3200,volume=0.8[w1];\
[8:a]adelay=17500|17500[a8];\
[9:a]adelay=17550|17550[a9];\
[10:a]adelay=17500|17500[a10];\
[11:a]adelay=22800|22800[a11];\
[12:a]adelay=22800|22800,volume=0.9[a12];\
[13:a]adelay=23400|23400[a13];\
[14:a]adelay=25400|25400[a14];\
[15:a]adelay=25400|25400[a15];\
[0:a][a1][a2][a3][a4][a5][a6][w1][a8][a9][a10][a11][a12][a13][a14][a15]\
amix=inputs=16:duration=longest:dropout_transition=0:normalize=0,\
alimiter=limit=0.95,aresample=48000,afade=t=out:st=27.8:d=0.7,afade=t=in:st=0:d=0.4[out]" \
 -map "[out]" -t 28.5 -c:a pcm_s16le "$D/master.wav" -loglevel error
echo "audio built: $D/master.wav"
ls -lh "$D/master.wav"
