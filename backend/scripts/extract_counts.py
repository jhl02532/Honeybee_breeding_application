#!/usr/bin/env python3
"""count.tar 의 sync 파일(콜로니별, A:T:C:G:N:DEL)에서 지정 마커 자리만 뽑아 TSV 로 쓴다.
python3 -I extract_counts.py count.tar markers.txt out.tsv [프로세스 수]
markers.txt: 한 줄에 '염색체번호:위치' (Amel_HAv3.1, LGn = NC_0376(37+n).1)"""
import bz2, multiprocessing as mp, sys, tarfile

TAR, MARKERS, OUT = sys.argv[1:4]
PROCS = int(sys.argv[4]) if len(sys.argv) > 4 else 32

want = {}
for line in open(MARKERS):
    c, p = line.strip().split(":")
    want[(f"NC_0376{37 + int(c)}.1", p)] = line.strip()


def scan(job):
    name, offset, size = job
    out, seen = [], None
    with open(TAR, "rb") as fh:
        fh.seek(offset)
        raw = fh.read(size)
    for i, line in enumerate(bz2.decompress(raw).decode().splitlines()):
        f = line.split(" ")
        if i == 0:
            seen = f[4]
            continue
        code = want.get((f[0], f[1]))
        if code:
            out.append("\t".join([name, seen, code, f[2], f[3]] + f[4].split(":")))
    return out


if __name__ == "__main__":
    with tarfile.open(TAR) as t:
        jobs = [(m.name.split("/")[-1].split(".")[0], m.offset_data, m.size) for m in t if m.isfile()]
    print(len(jobs), "files", len(want), "markers", flush=True)
    with open(OUT, "w") as o, mp.Pool(PROCS) as pool:
        o.write("file\theader\tmarker\tref\talt\tA\tT\tC\tG\tN\tDEL\n")
        for i, rows in enumerate(pool.imap_unordered(scan, jobs), 1):
            o.write("".join(r + "\n" for r in rows))
            if i % 200 == 0:
                print(i, flush=True)
    print("DONE", flush=True)
