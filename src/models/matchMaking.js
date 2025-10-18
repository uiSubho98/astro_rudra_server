import mongoose from 'mongoose';

const AshtakootScoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    language: { type: String, default: 'en' },
    female: {
        year: Number,
        month: Number,
        date: Number,
        hours: Number,
        minutes: Number,
        seconds: Number,
        latitude: Number,
        longitude: Number,
        timezone: Number
    },
    male: {
        year: Number,
        month: Number,
        date: Number,
        hours: Number,
        minutes: Number,
        seconds: Number,
        latitude: Number,
        longitude: Number,
        timezone: Number
    },
    response: Object,
    createdAt: { type: Date, default: Date.now }
});

const AshtakootScore = mongoose.model('AshtakootScore', AshtakootScoreSchema);

export default AshtakootScore;
