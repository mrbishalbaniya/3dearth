import { Scene } from '@babylonjs/core/scene';
import { Sound } from '@babylonjs/core/Audio/sound';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { AudioAction } from '../types/Events';

export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  spatialAudioEnabled: boolean;
  maxDistance: number;
  rolloffFactor: number;
}

export interface SoundOptions {
  loop?: boolean;
  autoplay?: boolean;
  volume?: number;
  spatialSound?: boolean;
  maxDistance?: number;
  rolloffFactor?: number;
  refDistance?: number;
  distanceModel?: string;
}

export class AudioEngine {
  private logger: Logger;
  private eventBus: EventBus;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, Sound>;
  private musicTracks: Map<string, Sound>;
  private currentMusic: Sound | null = null;
  private config: AudioConfig;
  private initialized: boolean = false;
  private muted: boolean = false;

  constructor() {
    this.logger = Logger.getInstance();
    this.eventBus = EventBus.getInstance();
    this.sounds = new Map();
    this.musicTracks = new Map();
    
    this.config = {
      masterVolume: 1.0,
      musicVolume: 0.7,
      effectsVolume: 0.8,
      spatialAudioEnabled: true,
      maxDistance: 100,
      rolloffFactor: 1
    };
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Audio Engine', 'Audio');
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle audio context state
      if (this.audioContext.state === 'suspended') {
        await this.resumeAudioContext();
      }
      
      this.setupAudioContextEvents();
      
      this.initialized = true;
      this.logger.info('Audio Engine initialized', 'Audio');
    } catch (error) {
      this.logger.error('Failed to initialize Audio Engine', 'Audio', error);
      throw error;
    }
  }

  private setupAudioContextEvents(): void {
    if (!this.audioContext) return;

    this.audioContext.addEventListener('statechange', () => {
      if (this.audioContext) {
        this.logger.debug(`Audio context state: ${this.audioContext.state}`, 'Audio');
      }
    });

    // Resume audio context on user interaction
    const resumeAudio = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
    };

    document.addEventListener('click', resumeAudio);
    document.addEventListener('touchstart', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
  }

  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public loadSound(id: string, url: string, scene: Scene, options: SoundOptions = {}): Promise<Sound> {
    return new Promise((resolve, reject) => {
      const defaultOptions: SoundOptions = {
        loop: false,
        autoplay: false,
        volume: this.config.effectsVolume,
        spatialSound: this.config.spatialAudioEnabled,
        maxDistance: this.config.maxDistance,
        rolloffFactor: this.config.rolloffFactor,
        refDistance: 1,
        distanceModel: 'exponential'
      };

      const finalOptions = { ...defaultOptions, ...options };

      const sound = new Sound(id, url, scene, () => {
        // Success callback
        this.sounds.set(id, sound);
        this.logger.debug(`Loaded sound: ${id}`, 'Audio');
        resolve(sound);
      }, {
        loop: finalOptions.loop,
        autoplay: finalOptions.autoplay,
        volume: finalOptions.volume! * this.config.masterVolume,
        spatialSound: finalOptions.spatialSound,
        maxDistance: finalOptions.maxDistance,
        rolloffFactor: finalOptions.rolloffFactor,
        refDistance: finalOptions.refDistance,
        distanceModel: finalOptions.distanceModel,
        onError: (sound: Sound, message: string) => {
          const errorMessage = `Failed to load sound ${id}: ${message}`;
          this.logger.error(errorMessage, 'Audio');
          reject(new Error(errorMessage));
        }
      });
    });
  }

  public loadMusic(id: string, url: string, scene: Scene, options: SoundOptions = {}): Promise<Sound> {
    return new Promise((resolve, reject) => {
      const musicOptions: SoundOptions = {
        loop: true,
        autoplay: false,
        volume: this.config.musicVolume,
        spatialSound: false,
        ...options
      };

      const music = new Sound(id, url, scene, () => {
        // Success callback
        this.musicTracks.set(id, music);
        this.logger.debug(`Loaded music: ${id}`, 'Audio');
        resolve(music);
      }, {
        loop: musicOptions.loop,
        autoplay: musicOptions.autoplay,
        volume: musicOptions.volume! * this.config.masterVolume,
        spatialSound: musicOptions.spatialSound,
        onError: (sound: Sound, message: string) => {
          const errorMessage = `Failed to load music ${id}: ${message}`;
          this.logger.error(errorMessage, 'Audio');
          reject(new Error(errorMessage));
        }
      });
    });
  }

  public playSound(id: string, position?: Vector3, volume?: number): boolean {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.logger.warning(`Sound not found: ${id}`, 'Audio');
      return false;
    }

    if (this.muted) {
      return false;
    }

    if (position && sound.spatialSound) {
      sound.setPosition(position);
    }

    if (volume !== undefined) {
      sound.setVolume(volume * this.config.effectsVolume * this.config.masterVolume);
    }

    sound.play();
    
    this.eventBus.emit('audio', {
      type: 'audio',
      timestamp: Date.now(),
      soundId: id,
      action: AudioAction.Play
    });

    return true;
  }

  public stopSound(id: string): boolean {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.logger.warning(`Sound not found: ${id}`, 'Audio');
      return false;
    }

    sound.stop();
    
    this.eventBus.emit('audio', {
      type: 'audio',
      timestamp: Date.now(),
      soundId: id,
      action: AudioAction.Stop
    });

    return true;
  }

  public pauseSound(id: string): boolean {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.logger.warning(`Sound not found: ${id}`, 'Audio');
      return false;
    }

    sound.pause();
    
    this.eventBus.emit('audio', {
      type: 'audio',
      timestamp: Date.now(),
      soundId: id,
      action: AudioAction.Pause
    });

    return true;
  }

  public playMusic(id: string, fadeInDuration: number = 0): boolean {
    const music = this.musicTracks.get(id);
    if (!music) {
      this.logger.warning(`Music not found: ${id}`, 'Audio');
      return false;
    }

    if (this.muted) {
      return false;
    }

    // Stop current music if playing
    if (this.currentMusic && this.currentMusic !== music) {
      this.stopMusic(0);
    }

    this.currentMusic = music;

    if (fadeInDuration > 0) {
      music.setVolume(0);
      music.play();
      this.fadeInMusic(music, fadeInDuration);
    } else {
      music.play();
    }

    this.eventBus.emit('audio', {
      type: 'audio',
      timestamp: Date.now(),
      soundId: id,
      action: AudioAction.Play
    });

    return true;
  }

  public stopMusic(fadeOutDuration: number = 0): void {
    if (!this.currentMusic) {
      return;
    }

    if (fadeOutDuration > 0) {
      this.fadeOutMusic(this.currentMusic, fadeOutDuration);
    } else {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }

  private fadeInMusic(music: Sound, duration: number): void {
    const targetVolume = this.config.musicVolume * this.config.masterVolume;
    const steps = 60; // 60 steps per second
    const stepDuration = duration * 1000 / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = volumeStep * currentStep;
      music.setVolume(newVolume);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        music.setVolume(targetVolume);
      }
    }, stepDuration);
  }

  private fadeOutMusic(music: Sound, duration: number): void {
    const initialVolume = music.getVolume();
    const steps = 60;
    const stepDuration = duration * 1000 / steps;
    const volumeStep = initialVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = initialVolume - (volumeStep * currentStep);
      music.setVolume(Math.max(0, newVolume));

      if (currentStep >= steps || newVolume <= 0) {
        clearInterval(fadeInterval);
        music.stop();
        if (this.currentMusic === music) {
          this.currentMusic = null;
        }
      }
    }, stepDuration);
  }

  public setSoundVolume(id: string, volume: number): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.setVolume(volume * this.config.effectsVolume * this.config.masterVolume);
    }
  }

  public setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update all sound volumes
    for (const sound of this.sounds.values()) {
      const currentVolume = sound.getVolume() / (this.config.effectsVolume * this.config.masterVolume);
      sound.setVolume(currentVolume * this.config.effectsVolume * this.config.masterVolume);
    }

    for (const music of this.musicTracks.values()) {
      const currentVolume = music.getVolume() / (this.config.musicVolume * this.config.masterVolume);
      music.setVolume(currentVolume * this.config.musicVolume * this.config.masterVolume);
    }
  }

  public setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    
    for (const music of this.musicTracks.values()) {
      const currentVolume = music.getVolume() / (this.config.musicVolume * this.config.masterVolume);
      music.setVolume(currentVolume * this.config.musicVolume * this.config.masterVolume);
    }
  }

  public setEffectsVolume(volume: number): void {
    this.config.effectsVolume = Math.max(0, Math.min(1, volume));
    
    for (const sound of this.sounds.values()) {
      const currentVolume = sound.getVolume() / (this.config.effectsVolume * this.config.masterVolume);
      sound.setVolume(currentVolume * this.config.effectsVolume * this.config.masterVolume);
    }
  }

  public mute(muted: boolean): void {
    this.muted = muted;
    
    if (muted) {
      this.pauseAllSounds();
      if (this.currentMusic) {
        this.currentMusic.pause();
      }
    } else {
      // Resume could be implemented based on game state
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private pauseAllSounds(): void {
    for (const sound of this.sounds.values()) {
      if (sound.isPlaying) {
        sound.pause();
      }
    }
  }

  public resumeAllSounds(): void {
    for (const sound of this.sounds.values()) {
      if (sound.isPaused) {
        sound.play();
      }
    }
    
    if (this.currentMusic && this.currentMusic.isPaused) {
      this.currentMusic.play();
    }
  }

  public setSpatialAudioEnabled(enabled: boolean): void {
    this.config.spatialAudioEnabled = enabled;
  }

  public setListenerPosition(position: Vector3): void {
    // Update listener position for spatial audio
    for (const sound of this.sounds.values()) {
      if (sound.spatialSound) {
        // Babylon.js handles listener position automatically with camera
      }
    }
  }

  public update(deltaTime: number): void {
    // Update audio system
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.resumeAudioContext();
    }
  }

  public getSound(id: string): Sound | undefined {
    return this.sounds.get(id);
  }

  public getMusic(id: string): Sound | undefined {
    return this.musicTracks.get(id);
  }

  public getCurrentMusic(): Sound | null {
    return this.currentMusic;
  }

  public getLoadedSounds(): string[] {
    return Array.from(this.sounds.keys());
  }

  public getLoadedMusic(): string[] {
    return Array.from(this.musicTracks.keys());
  }

  public dispose(): void {
    this.logger.info('Disposing Audio Engine', 'Audio');
    
    // Stop and dispose all sounds
    for (const sound of this.sounds.values()) {
      sound.dispose();
    }
    
    for (const music of this.musicTracks.values()) {
      music.dispose();
    }
    
    this.sounds.clear();
    this.musicTracks.clear();
    this.currentMusic = null;
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.initialized = false;
  }
}