import os
import torch
import whisper
from pyannote.audio import Pipeline
from ..core.config import settings  

class AudioDiarizationService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.hf_token = os.getenv("HUGGINGFACE_TOKEN") 
        
        if not self.hf_token:
            print("WARNING: HUGGINGFACE_TOKEN not found. Diarization might fail.")

    def process_audio(self, file_path: str):
        print(f"Loading models on {self.device}...")
        
        # Load Whisper & Transcribe
        model = whisper.load_model("medium", device=self.device)
        print("Transcribing with Whisper...")
        asr_result = model.transcribe(file_path)
        
        # Load Pyannote & Diarize
        print("Diarizing with Pyannote...")
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=self.hf_token
        ).to(torch.device(self.device))
        
        diarization = pipeline(file_path)

        final_segments = self._merge_speaker_and_text(asr_result["segments"], diarization)
        
        # Full text 
        formatted_text = "\n".join([f"{seg['speaker']}: {seg['text']}" for seg in final_segments])
        
        return {
            "full_text": formatted_text,  
            "raw_text": asr_result["text"],
            "segments": final_segments    
        }

    def _merge_speaker_and_text(self, whisper_segments, diarization_result):
        final_output = []
        
        for segment in whisper_segments:
            start = segment["start"]
            end = segment["end"]
            text = segment["text"].strip()
            
            best_speaker = "Unknown"
            max_overlap = 0
            
            for turn, _, speaker in diarization_result.itertracks(yield_label=True):
                intersection_start = max(start, turn.start)
                intersection_end = min(end, turn.end)
                overlap = max(0, intersection_end - intersection_start)
                
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_speaker = speaker
            
            final_output.append({
                "start": start,
                "end": end,
                "speaker": best_speaker,
                "text": text
            })
            
        return final_output

def run_diarization_pipeline(file_path: str):
    service = AudioDiarizationService()
    return service.process_audio(file_path)