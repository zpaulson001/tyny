import json
from fastapi import APIRouter, HTTPException, Request
import random
import asyncio
from typing import TypedDict, Literal

from fastapi.responses import StreamingResponse

router = APIRouter()

# Define allowed language codes from the comprehensive language list
LanguageCode = Literal[
    "ace_Arab",
    "ace_Latn",
    "afr_Latn",
    "aka_Latn",
    "amh_Ethi",
    "hye_Armn",
    "asm_Beng",
    "ast_Latn",
    "awa_Deva",
    "quy_Latn",
    "ban_Latn",
    "bam_Latn",
    "bjn_Arab",
    "bjn_Latn",
    "bak_Cyrl",
    "eus_Latn",
    "bel_Cyrl",
    "bem_Latn",
    "ben_Beng",
    "bho_Deva",
    "bos_Latn",
    "bug_Latn",
    "bul_Cyrl",
    "mya_Mymr",
    "cat_Latn",
    "ceb_Latn",
    "tzm_Tfng",
    "ayr_Latn",
    "knc_Arab",
    "knc_Latn",
    "ckb_Arab",
    "hne_Deva",
    "zho_Hans",
    "zho_Hant",
    "cjk_Latn",
    "crh_Latn",
    "hrv_Latn",
    "ces_Latn",
    "dan_Latn",
    "prs_Arab",
    "nld_Latn",
    "dyu_Latn",
    "dzo_Tibt",
    "pan_Guru",
    "ydd_Hebr",
    "arz_Arab",
    "eng_Latn",
    "epo_Latn",
    "est_Latn",
    "ewe_Latn",
    "fao_Latn",
    "fij_Latn",
    "fin_Latn",
    "fon_Latn",
    "fra_Latn",
    "fur_Latn",
    "glg_Latn",
    "lug_Latn",
    "kat_Geor",
    "deu_Latn",
    "ell_Grek",
    "grn_Latn",
    "guj_Gujr",
    "hat_Latn",
    "khk_Cyrl",
    "hau_Latn",
    "heb_Hebr",
    "hin_Deva",
    "hun_Latn",
    "isl_Latn",
    "ibo_Latn",
    "ilo_Latn",
    "ind_Latn",
    "gle_Latn",
    "ita_Latn",
    "jpn_Jpan",
    "jav_Latn",
    "kac_Latn",
    "kbp_Latn",
    "kea_Latn",
    "kab_Latn",
    "kam_Latn",
    "kan_Knda",
    "kas_Arab",
    "kas_Deva",
    "kaz_Cyrl",
    "khm_Khmr",
    "kon_Latn",
    "kik_Latn",
    "kmb_Latn",
    "kin_Latn",
    "kor_Hang",
    "kir_Cyrl",
    "lao_Laoo",
    "ltg_Latn",
    "lij_Latn",
    "lim_Latn",
    "lin_Latn",
    "lit_Latn",
    "lmo_Latn",
    "lua_Latn",
    "luo_Latn",
    "ltz_Latn",
    "mkd_Cyrl",
    "mag_Deva",
    "mai_Deva",
    "mal_Mlym",
    "mlt_Latn",
    "mri_Latn",
    "mar_Deva",
    "mni_Beng",
    "acm_Arab",
    "min_Arab",
    "min_Latn",
    "lus_Latn",
    "arb_Latn",
    "arb_Arab",
    "ary_Arab",
    "mos_Latn",
    "ars_Arab",
    "npi_Deva",
    "fuv_Latn",
    "azj_Latn",
    "apc_Arab",
    "kmr_Latn",
    "nso_Latn",
    "uzn_Latn",
    "nob_Latn",
    "nno_Latn",
    "nus_Latn",
    "nya_Latn",
    "oci_Latn",
    "ory_Orya",
    "pag_Latn",
    "pap_Latn",
    "plt_Latn",
    "pol_Latn",
    "por_Latn",
    "ron_Latn",
    "run_Latn",
    "rus_Cyrl",
    "smo_Latn",
    "sag_Latn",
    "san_Deva",
    "sat_Olck",
    "srd_Latn",
    "gla_Latn",
    "srp_Cyrl",
    "shn_Mymr",
    "sna_Latn",
    "scn_Latn",
    "szl_Latn",
    "snd_Arab",
    "sin_Sinh",
    "slk_Latn",
    "slv_Latn",
    "som_Latn",
    "azb_Arab",
    "ajp_Arab",
    "pbt_Arab",
    "sot_Latn",
    "dik_Latn",
    "spa_Latn",
    "lvs_Latn",
    "zsm_Latn",
    "bod_Tibt",
    "sun_Latn",
    "swh_Latn",
    "ssw_Latn",
    "swe_Latn",
    "tgl_Latn",
    "tgk_Cyrl",
    "taq_Latn",
    "taq_Tfng",
    "tam_Taml",
    "tat_Cyrl",
    "acq_Arab",
    "tel_Telu",
    "tha_Thai",
    "tir_Ethi",
    "tpi_Latn",
    "als_Latn",
    "tso_Latn",
    "tsn_Latn",
    "tum_Latn",
    "aeb_Arab",
    "tur_Latn",
    "tuk_Latn",
    "twi_Latn",
    "ukr_Cyrl",
    "umb_Latn",
    "urd_Arab",
    "uig_Arab",
    "vec_Latn",
    "vie_Latn",
    "war_Latn",
    "cym_Latn",
    "gaz_Latn",
    "pes_Arab",
    "wol_Latn",
    "xho_Latn",
    "yor_Latn",
    "yue_Hant",
    "zul_Latn",
]


class Room(TypedDict):
    transcriptions: list[asyncio.Queue[str]]
    translations: dict[LanguageCode, list[asyncio.Queue[str]]]


class SSEManager:
    def __init__(self):
        self.rooms: dict[str, Room] = {}

    def create_room(self):
        room_id = f"{random.randint(0, 9999):04d}"

        while room_id in self.rooms:
            room_id = f"{random.randint(0, 9999):04d}"

        self.rooms[room_id] = Room(
            transcriptions=[],
            translations={},
        )

        return room_id

    def subscribe_to_room(
        self,
        room_id: str,
        queue: asyncio.Queue[str],
        language_code: LanguageCode | list[LanguageCode],
        no_transcriptions: bool = False,
    ):
        if room_id not in self.rooms:
            raise HTTPException(status_code=404, detail="Room not found.")

        room = self.rooms[room_id]

        if not no_transcriptions:
            room["transcriptions"].append(queue)

        lang_code_arr: list[LanguageCode] = []

        if not isinstance(language_code, list):
            lang_code_arr.append(language_code)

        for lang_code in lang_code_arr:
            if lang_code not in room["translations"]:
                room["translations"][lang_code] = [queue]
            else:
                room["translations"][lang_code].append(queue)


sse_manager = SSEManager()


@router.post("/rooms")
async def create_room():
    room_id = sse_manager.create_room()
    return {"room_id": room_id}


@router.post("/rooms/{room_id}")
async def send_audio(room_id: str, request: Request):
    if room_id not in sse_manager.rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found. Please create a room before sending audio.",
        )

    audio_data = await request.body()
    print(audio_data)

    for queue in sse_manager.rooms[room_id]["transcriptions"]:
        queue.put_nowait(str(audio_data))

    return None


@router.get("/rooms")
async def get_rooms():
    return {"rooms": list(sse_manager.rooms.keys())}


@router.post("/rooms/{room_id}/listen")
async def listen_to_room(room_id: str, language_code: LanguageCode):
    if room_id not in sse_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found.")

    # Create a new async queue for this client
    q: asyncio.Queue[str] = asyncio.Queue()
    sse_manager.subscribe_to_room(room_id, q, language_code)

    async def event_generator():
        try:
            while True:
                # Wait for new messages in the queue
                message = await q.get()
                yield f"data: {json.dumps(message)}\n\n"
        except asyncio.CancelledError:
            # Client disconnected
            print(f"Client disconnected from room: {room_id}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")
