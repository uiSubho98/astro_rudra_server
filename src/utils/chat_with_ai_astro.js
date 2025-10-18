import axios from "axios";

// Conversation memory to maintain consistency across sessions
const conversationMemory = new Map();

// Enhanced Vedic Astrology Knowledge Base
const vedicKnowledge = `
Key Vedic Astrology Concepts for Predictions:

RASHI SYSTEM (Moon Signs):
- Mesha (Aries): 0° - 30°
- Vrishabha (Taurus): 30° - 60° 
- Mithuna (Gemini): 60° - 90°
- Karka (Cancer): 90° - 120°
- Simha (Leo): 120° - 150°
- Kanya (Virgo): 150° - 180°
- Tula (Libra): 180° - 210°
- Vrishchika (Scorpio): 210° - 240°
- Dhanu (Sagittarius): 240° - 270°
- Makara (Capricorn): 270° - 300°
- Kumbha (Aquarius): 300° - 330°
- Meena (Pisces): 330° - 360°

TIMING PREDICTIONS:
- Current Year: 2025
- Marriage Timing: 7th house, Venus, Jupiter transits, appropriate dasha periods
- Business/Career: 10th and 9th and 11th and 2nd house, Saturn, Mars influences, appropriate dasha
- Financial Recovery: 2nd and 11th house influences, Jupiter and Saturn transits
- Health Issues: 6th house and 8th house, Saturn and Mars aspects

DASHA SYSTEM:
- Vimshottari Dasha periods determine timing of events
- Each planet rules specific life areas and time periods
- Major periods (Mahadasha) and sub-periods (Antardasha) and (Pratyantardasha) are crucial for predictions

TRANSITS (Gochara):
- Jupiter transit: Major life changes, marriage, business expansion
- Saturn transit: Delays, obstacles, but also stability after struggle  
- Rahu-Ketu transit: Sudden changes, karmic events
- Mars transit: Action, conflicts, property matters , love matters , marriage matters

YOGAS FOR PREDICTIONS:
- Gaja Kesari Yoga: Success and prosperity
- Raj Yoga: Power and authority
- Dhana Yoga: Wealth accumulation
- Viparita Raja Yoga: Success after struggles
- Budhaditya Yoga: Wealth accumulation .
- Angarak Yoga : Prone to accidents or intense outbursts of anger.
- Sadhusarp Yoga : It can delays on any activities .

`;

// Function to calculate accurate Rashi from Moon longitude
function calculateRashi(moonLongitude) {
  const rashiNames = [
    "Mesha (Aries)",
    "Vrishabha (Taurus)",
    "Mithuna (Gemini)",
    "Karka (Cancer)",
    "Simha (Leo)",
    "Kanya (Virgo)",
    "Tula (Libra)",
    "Vrishchika (Scorpio)",
    "Dhanu (Sagittarius)",
    "Makara (Capricorn)",
    "Kumbha (Aquarius)",
    "Meena (Pisces)",
  ];

  // Each rashi is 30 degrees
  const rashiIndex = Math.floor(moonLongitude / 30);
  return {
    rashi: rashiNames[rashiIndex % 12],
    rashiNumber: (rashiIndex % 12) + 1,
    degreeInRashi: moonLongitude % 30,
  };
}

// Function to calculate Nakshatra from Moon longitude
function calculateNakshatra(moonLongitude) {
  const nakshatras = [
    { name: "Ashwini", lord: "Ketu" },
    { name: "Bharani", lord: "Venus" },
    { name: "Krittika", lord: "Sun" },
    { name: "Rohini", lord: "Moon" },
    { name: "Mrigashira", lord: "Mars" },
    { name: "Ardra", lord: "Rahu" },
    { name: "Punarvasu", lord: "Jupiter" },
    { name: "Pushya", lord: "Saturn" },
    { name: "Ashlesha", lord: "Mercury" },
    { name: "Magha", lord: "Ketu" },
    { name: "Purva Phalguni", lord: "Venus" },
    { name: "Uttara Phalguni", lord: "Sun" },
    { name: "Hasta", lord: "Moon" },
    { name: "Chitra", lord: "Mars" },
    { name: "Swati", lord: "Rahu" },
    { name: "Vishakha", lord: "Jupiter" },
    { name: "Anuradha", lord: "Saturn" },
    { name: "Jyeshtha", lord: "Mercury" },
    { name: "Mula", lord: "Ketu" },
    { name: "Purva Ashadha", lord: "Venus" },
    { name: "Uttara Ashadha", lord: "Sun" },
    { name: "Shravana", lord: "Moon" },
    { name: "Dhanishta", lord: "Mars" },
    { name: "Shatabhisha", lord: "Rahu" },
    { name: "Purva Bhadrapada", lord: "Jupiter" },
    { name: "Uttara Bhadrapada", lord: "Saturn" },
    { name: "Revati", lord: "Mercury" },
  ];

  // Each nakshatra is 13.33 degrees (360/27)
  const nakshatraIndex = Math.floor(moonLongitude / 13.333333);
  const nakshatra = nakshatras[nakshatraIndex % 27];

  return {
    name: nakshatra.name,
    lord: nakshatra.lord,
    pada: Math.floor((moonLongitude % 13.333333) / 3.333333) + 1,
  };
}

// Function to get planetary aspects from Vedic API
async function getPlanetaryAspects(dob, tob, lat, lon, tz, apiKey) {
  try {
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const [year, month, day] = dob.split("T")[0].split("-");
    const formattedDob = `${day}/${month}/${year}`;

    // Format time from HH:MM:SS to HH:MM
    const formattedTob = tob ? tob.slice(0, 5) : "05:30";

    const response = await axios.post(
      "https://api.vedicastroapi.com/v3-json/horoscope/planetary-aspects",
      {
        dob: formattedDob,
        tob: formattedTob,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        tz: parseFloat(tz),
        lang: "en",
        api_key: apiKey,
        aspect_response_type: "planets",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching planetary aspects:",
      error.response?.data || error.message
    );
    return generateConsistentFallbackData(dob);
  }
}

// Generate consistent fallback data based on birth date
function generateConsistentFallbackData(dob) {
  const date = new Date(dob);
  const day = date.getDate();
  const month = date.getMonth() + 1;

  // Deterministic calculation based on birth date
  const zodiacSigns = [
    "Mesha (Aries)",
    "Vrishabha (Taurus)",
    "Mithuna (Gemini)",
    "Karka (Cancer)",
    "Simha (Leo)",
    "Kanya (Virgo)",
    "Tula (Libra)",
    "Vrishchika (Scorpio)",
    "Dhanu (Sagittarius)",
    "Makara (Capricorn)",
    "Kumbha (Aquarius)",
    "Meena (Pisces)",
  ];

  // Simple but consistent calculation
  const zodiacIndex = (month - 1) % 12;
  const zodiacSign = zodiacSigns[zodiacIndex];

  // Generate consistent planetary positions
  const planets = {
    Sun: { sign: zodiacSign, longitude: (month * 30 + day) % 360 },
    Moon: {
      sign: zodiacSigns[(zodiacIndex + 3) % 12],
      longitude: (month * 30 + day + 90) % 360,
    },
    Mars: {
      sign: zodiacSigns[(zodiacIndex + 6) % 12],
      longitude: (month * 30 + day + 180) % 360,
    },
    Mercury: {
      sign: zodiacSigns[(zodiacIndex + 2) % 12],
      longitude: (month * 30 + day + 60) % 360,
    },
    Jupiter: {
      sign: zodiacSigns[(zodiacIndex + 9) % 12],
      longitude: (month * 30 + day + 270) % 360,
    },
    Venus: {
      sign: zodiacSigns[(zodiacIndex + 7) % 12],
      longitude: (month * 30 + day + 210) % 360,
    },
    Saturn: {
      sign: zodiacSigns[(zodiacIndex + 10) % 12],
      longitude: (month * 30 + day + 300) % 360,
    },
    Rahu: {
      sign: zodiacSigns[(zodiacIndex + 5) % 12],
      longitude: (month * 30 + day + 150) % 360,
    },
    Ketu: {
      sign: zodiacSigns[(zodiacIndex + 11) % 12],
      longitude: (month * 30 + day + 330) % 360,
    },
  };

  // Add aspect data for each planet
  const response = {};
  for (const [planet, data] of Object.entries(planets)) {
    response[planet] = {
      planet,
      sign: data.sign,
      longitude: data.longitude,
      // Generate consistent aspects based on planet position
      aspected_houses: [((Math.floor(data.longitude / 30) + 1) % 12) + 1],
      aspected_house_zodiacs: [
        zodiacSigns[Math.floor(data.longitude / 30) % 12],
      ],
      aspected_by_rasi_no: [Math.floor(data.longitude / 30) + 1],
    };
  }

  return {
    status: 200,
    response,
    message: "Consistent astrological data generated",
  };
}

// Function to analyze chart for specific predictions
function analyzeForPredictions(chartData, questionType) {
  if (!chartData || !chartData.response) return "";

  let analysis = "";
  const planets = chartData.response;
  const currentYear = 2025; // Fixed current year

  // Extract Moon data for accurate Rashi calculation
  let moonRashi = null;
  let nakshatra = null;

  if (planets.Moon && planets.Moon.longitude) {
    const rashiData = calculateRashi(planets.Moon.longitude);
    const nakshatraData = calculateNakshatra(planets.Moon.longitude);

    moonRashi = rashiData.rashi;
    nakshatra = nakshatraData;

    analysis += `Your Janma Rashi (Moon Sign): ${moonRashi}. `;
    analysis += `Birth Nakshatra: ${nakshatra.name} (${nakshatra.pada} pada, ruled by ${nakshatra.lord}). `;
  }

  // Specific analysis based on question type
  switch (questionType.toLowerCase()) {
    case "marriage":
      analysis += analyzeMarriageProspects(planets, currentYear);
      break;
    case "relationship":
      analysis += analyzeRelationshipIssues(planets, currentYear);
      break;
    case "business":
      analysis += analyzeBusinessRecovery(planets, currentYear);
      break;
    case "career":
      analysis += analyzeCareerProblems(planets, currentYear);
      break;
    case "health":
      analysis += analyzeHealthIssues(planets, currentYear);
      break;
    case "general":
    default:
      analysis += analyzeGeneralPredictions(planets, currentYear);
      break;
  }

  return analysis;
}

// Specific analysis functions
function analyzeMarriageProspects(planets, currentYear) {
  let analysis = "";

  // Check 7th house and Venus position
  if (planets.Venus) {
    analysis += `Venus (marriage significator) is in ${planets.Venus.sign}. `;
  }

  if (planets.Jupiter) {
    analysis += `Jupiter's blessings for marriage are influenced by its position in ${planets.Jupiter.sign}. `;
  }

  // Simple timing prediction
  analysis += `Based on planetary positions, favorable marriage period could be in ${currentYear + 1}-${currentYear + 2}. `;
  analysis +=
    "Perform Venus mantras and consider wearing white clothes on Fridays for better marriage prospects. ";

  return analysis;
}

// In the analyzeRelationshipIssues function:
function analyzeRelationshipIssues(planets, currentYear) {
  let analysis = "";

  // Analysis of specific planetary combinations
  if (planets.Mars && planets.Venus) {
    analysis += `Mars-Venus combination in your chart affects relationship harmony. `;
    analysis +=
      "Mars in " +
      planets.Mars.sign +
      " and Venus in " +
      planets.Venus.sign +
      " create specific relationship patterns. ";
  }

  // Analysis of Rahu, Moon (Mongol), and Venus (Sukro) in key houses
  if (
    planets.Rahu?.house === 1 ||
    planets.Rahu?.house === 6 ||
    planets.Rahu?.house === 7 ||
    planets.Rahu?.house === 5
  ) {
    analysis += `Rahu in the ${planets.Rahu.house}th house creates illusions and unexpected events in relationships. `;
  }
  if (
    planets.Moon?.house === 1 ||
    planets.Moon?.house === 6 ||
    planets.Moon?.house === 7
  ) {
    analysis += `The Moon in the ${planets.Moon.house}th house makes emotions and needs highly influential in your partnerships. `;
  }
  if (
    planets.Venus?.house === 1 ||
    planets.Venus?.house === 6 ||
    planets.Venus?.house === 7
  ) {
    analysis += `Venus in the ${planets.Venus.house}th house directly impacts your approach to love and harmony. `;
  }

  // Add specific remedies for relationship issues (including the ones you requested)
  analysis += "\n\n**Recommended Remedies:** ";
  analysis +=
    "Wear a Rose Quartz or Rhodochrosite love bracelet on your right hand. ";
  analysis +=
    "For calming conflict and enhancing commitment, wear a 6 Mukhi Rudraksha. ";
  analysis +=
    "Place a Rose Quartz Crystal  in the Southwest corner of your home. ";
  analysis += "Place a Love Tree in the bedroom of your home. ";
  analysis +=
    "For deeper issues, consider a Dove crystal or a Rhodocrosite+Rose Quartz combination from our Astromall. ";
  analysis +=
    "Chant 'Om Shukraya Namaha' 108 times daily for improving relationships. ";

  // Timing prediction
  analysis += `\n\nRelationship improvements are expected around mid-${currentYear} to early ${currentYear + 1}.  `;

  return analysis;
}

// In the analyzeBusinessRecovery function:
function analyzeBusinessRecovery(planets, currentYear) {
  let analysis = "";

  if (planets.Saturn && planets.Mars) {
    analysis += `Saturn in ${planets.Saturn.sign} indicates delayed but stable business growth. `;
    if (
      planets.Saturn.sign.includes("Capricorn") ||
      planets.Saturn.sign.includes("Aquarius")
    ) {
      analysis +=
        "With Saturn in 10th, 6th, or 2nd house positions, focus on discipline and long-term planning. ";
      analysis +=
        "Remedy: Maintain vegetarian diet on Saturdays, chant 'Om Sham Shanaishcharaaya Namah'. ";
      analysis +=
        "Consider Amethyst, Pyrite crystals or 7 mukhi rudraksha for Saturn's energy. ";
    }
    analysis += `Mars in ${planets.Mars.sign} brings energy for business initiatives. `;
  }

  if (planets.Jupiter) {
    analysis += `Jupiter's transit through ${planets.Jupiter.sign} will bring business opportunities. `;
  }

  // Add specific career crystals and remedies
  analysis +=
    "For career success: Consider Citrine + Green Aventurine combination, Money magnet crystals, Pyrite, or Golden Hematite from our Astromall. ";
  analysis += `Business recovery expected in late ${currentYear} or early ${currentYear + 1}. `;
  analysis +=
    "Perform Ganesha puja on Wednesdays and donate to educational causes for business success. ";

  return analysis;
}

function analyzeCareerProblems(planets, currentYear) {
  let analysis = "";

  // 1. Analysis of Saturn (Shani) - Key planet for career, discipline, and obstacles
  if (planets.Saturn) {
    analysis += `Saturn in ${planets.Saturn.sign} and the ${planets.Saturn.house}th house indicates a path of delayed but stable career growth, requiring hard work and discipline. `;
    // Specific advice for Saturn in key career houses
    if (planets.Saturn.house === 1 || planets.Saturn.house === 10) {
      analysis +=
        "This placement often brings karmic lessons and responsibilities through your career and public image. ";
    }
    if (planets.Saturn.house === 3 || planets.Saturn.house === 6) {
      analysis +=
        "You must persevere through daily challenges, competition, and efforts to achieve your goals. ";
    }
  }

  if (planets.Mars) {
    analysis += `Mars in ${planets.Mars.sign} and the ${planets.Mars.house}th house brings dynamic energy and initiative to your career pursuits. `;

    if (planets.Mars.house === 6) {
      analysis +=
        "Mars in the 6th house is a powerful placement that grants immense courage and makes you a warrior who fears no enemies. You are destined to overcome all competitors, opponents, and legal challenges. However, this same aggressive energy can lead to heated arguments, disputes, and a tendency to break relationships due to a sharp tongue or impulsive reactions. In terms of progeny, this strong Martian energy traditionally indicates a higher probability of the native fathering male children (sons). To channel this energy constructively and avoid unnecessary conflicts, regular physical exercise is crucial. Chanting the Hanuman Chalisa  can help balance the aggressive tendencies.";
    }

    if (planets.Mars.house === 12) {
      analysis +=
        "Mars in the 12th house can create a deep-seated, subconscious anger and a strong fear of death or hidden enemies. This placement often leads to feelings of isolation, a disconnect from family and home life or you may be involved into legal cases, and a tendency to engage in secret conflicts or self-sabotaging behavior. The immense energy of Mars is internalized, which can be draining. ";
    }

    if (planets.Mars.house === 1 || planets.Mars.house === 8) {
      analysis +=
        "Mars in the 1st house grants immense physical energy and courage, but its raw, uncontrolled nature can lead to a tendency for accidents, injuries, and high-risk behavior. This fierce placement requires conscious channeling to avoid self-harm or volatile situations. To pacify this intense energy and protect your vitality, wear a Red Jasper Bracelet on your right hand. Chant the Maha Mrityunjaya mantra 21 times daily for ultimate protection against accidents and to conquer the fear of death.";
    }
    // Specific advice for Mars in key career houses
    if (
      planets.Mars.house === 1 ||
      planets.Mars.house === 3 ||
      planets.Mars.house === 6 ||
      planets.Mars.house === 10
    ) {
      analysis +=
        "This can make you a competitive and driven professional, but be mindful of impulsiveness or conflicts with authorities. Wear Red Jasper Bracelet in your Right hand . Buy from our astromall shop. Chant Hanuman Chalisa daily 7 times before you sleep .";
    }
    if (planets.Mars.house === 6) {
      analysis +=
        "Mars in the 6th house gives strong energy to overcome competitors and handle demanding work. Wear Red Jasper Bracelet in your right hand . Buy from our astromall shop. ";
    }
    if (planets.Mars.house === 10) {
      analysis +=
        "Mars in the 10th house drives ambition and a desire for an authoritative career, often in fields like engineering, police, or military. ";
    }
  }

  // 2. Analysis of other specified planets: Moon (Mongol), Sun, Mercury (Budh)

  if (
    planets.Sun?.house === 1 ||
    planets.Sun?.house === 3 ||
    planets.Sun?.house === 6 ||
    planets.Sun?.house === 10
  ) {
    analysis += `The Sun in your ${planets.Sun.house}th house highlights leadership, authority, and recognition as key themes in your career path. `;
  }
  if (
    planets.Mercury?.house === 1 ||
    planets.Mercury?.house === 3 ||
    planets.Mercury?.house === 6 ||
    planets.Mercury?.house === 10
  ) {
    analysis += `Mercury in your ${planets.Mercury.house}th house suggests success through communication, analytics, business, and networking. `;
  }

  // 3. Add specific career crystals and remedies (including the ones you requested)
  analysis += "\n\n**Recommended Remedies for Career Growth:** ";
  analysis +=
    "To pacify Saturn and remove obstacles, wear a 7 Mukhi Rudraksha. ";
  analysis +=
    "For overall career success and stability, wear a Pyrite or Tiger's Eye bracelet. ";
  analysis +=
    "For attracting opportunities and wealth, consider a Citrine + Green Aventurine combination, Money Magnet crystals, or Golden Hematite from our Astromall. ";
  analysis +=
    "Chant 'Om Sham Shanaishcharaaya Namah' on Saturdays for Saturn's blessings. ";

  // 4. General timing and advice
  analysis += `\n\nCareer improvements and recovery are expected in late ${currentYear} or early ${currentYear + 1}. `;
  analysis +=
    "Perform Ganesha puja on Wednesdays . Contact our astrologer from rudraganga app . ";

  return analysis;
}

function analyzeHealthIssues(planets, currentYear) {
  let analysis = "";

  // Analysis based on Planets in specific health-related houses
  analysis += "**Health Analysis based on Planetary Positions:**\n";

  // Moon (Mongol) Analysis
  if (
    planets.Moon?.house === 1 ||
    planets.Moon?.house === 6 ||
    planets.Moon?.house === 8 ||
    planets.Moon?.house === 12
  ) {
    analysis += `The Moon in your ${planets.Moon.house}th house influences your mental and physical well-being. `;
    analysis += `Its placement in ${planets.Moon.sign} can indicate sensitivities related to fluids, digestion, and emotional stress. `;
  }

  // Ketu Analysis
  if (
    planets.Ketu?.house === 1 ||
    planets.Ketu?.house === 6 ||
    planets.Ketu?.house === 8 ||
    planets.Ketu?.house === 12
  ) {
    analysis += `Ketu in the ${planets.Ketu.house}th house can cause mysterious or chronic health issues, often related to its sign placement. It requires a spiritual approach to healing. `;
  }

  // Rahu Analysis
  if (
    planets.Rahu?.house === 1 ||
    planets.Rahu?.house === 6 ||
    planets.Rahu?.house === 8 ||
    planets.Rahu?.house === 12
  ) {
    analysis += `Rahu in the ${planets.Rahu.house}th house can lead to sudden, unpredictable health concerns, addictions, or modern diseases. Regular check-ups are advised. `;
  }

  // Saturn (Shani) Analysis
  if (
    planets.Saturn?.house === 1 ||
    planets.Saturn?.house === 6 ||
    planets.Saturn?.house === 8 ||
    planets.Saturn?.house === 12
  ) {
    analysis += `Saturn in the ${planets.Saturn.house}th house suggests issues related to chronic fatigue, bones, teeth, joints, or slow metabolism. Discipline in health routine is key. `;
  }

  // Jupiter (Guru) Analysis - The healer, but placement can show areas of overindulgence
  if (planets.Jupiter) {
    analysis += `Jupiter in ${planets.Jupiter.sign} and the ${planets.Jupiter.house}th house acts as a protective shield. `;
    if (
      planets.Jupiter.house === 6 ||
      planets.Jupiter.house === 8 ||
      planets.Jupiter.house === 12
    ) {
      analysis += `Its placement in a challenging house helps overcome health obstacles, but watch for overindulgence leading to issues with the liver, pancreas, or weight. `;
    }
  }

  // Recommended Remedies for Health
  analysis += "\n\n**Recommended Remedies for Health & Longevity:** ";
  analysis +=
    "For overall health and to pacify Jupiter, wear a 5 Mukhi Rudraksha. ";
  analysis +=
    "To strengthen Jupiter's healing energy, wear a  a Yellow Topaz bracelet after proper consultation. You can take consultation from our astrologer . ";
  analysis +=
    "Chant the Guru Mantra 'Om Gram Grim Graum Sah Gurave Namah' 108 times daily, especially on Thursdays. ";
  analysis +=
    "Worship the Jupiter Yantra (Guru Yantra) by offering yellow flowers and turmeric. ";

  // General advice
  analysis += `\n\nA positive shift in health and vitality is indicated around mid to late ${currentYear + 1} with consistent remedial measures. `;
  analysis +=
    "Always consult a medical professional for health diagnoses; these are supportive astrological guidelines.";

  return analysis;
}

function analyzeGeneralPredictions(planets, currentYear) {
  let analysis = "";

  analysis += `Current year ${currentYear} planetary influences: `;

  if (planets.Sun) {
    analysis += `Sun in ${planets.Sun.sign} affects your confidence and authority. `;
  }

  if (planets.Moon) {
    analysis += `Moon's position influences your emotional well-being and mental peace. `;
  }

  return analysis;
}

// Function to extract consistent Rashi from conversation history
function extractConsistentRashi(userId, birthChartData) {
  // Check if we have stored Rashi for this user
  if (conversationMemory.has(userId)) {
    const userData = conversationMemory.get(userId);
    if (userData.consistentRashi) {
      return userData.consistentRashi;
    }
  }

  // If not found in memory, calculate from birth chart
  if (birthChartData && birthChartData.response?.Moon) {
    const moonLongitude = birthChartData.response.Moon.longitude;
    if (moonLongitude !== undefined) {
      const rashiData = calculateRashi(moonLongitude);

      // Store in memory for future consistency
      if (conversationMemory.has(userId)) {
        const userData = conversationMemory.get(userId);
        userData.consistentRashi = rashiData.rashi;
        conversationMemory.set(userId, userData);
      } else {
        conversationMemory.set(userId, { consistentRashi: rashiData.rashi });
      }

      return rashiData.rashi;
    }
  }

  return null;
}

// Function to categorize question from user query
function categorizeQuestion(question) {
  const questionLower = question.toLowerCase();

  if (
    questionLower.includes("marry") ||
    questionLower.includes("marriage") ||
    questionLower.includes("wedding") ||
    questionLower.includes("शादी") ||
    questionLower.includes("विवाह")
  ) {
    return "marriage";
  }

  if (
    questionLower.includes("relationship") ||
    questionLower.includes("love") ||
    questionLower.includes("partner") ||
    questionLower.includes("रिश्ता") ||
    questionLower.includes("प्रेम")
  ) {
    return "relationship";
  }

  if (
    questionLower.includes("business") ||
    questionLower.includes("career") ||
    questionLower.includes("job") ||
    questionLower.includes("loss") ||
    questionLower.includes("recover") ||
    questionLower.includes("व्यवसाय") ||
    questionLower.includes("नौकरी") ||
    questionLower.includes("हानि")
  ) {
    return "business";
  }

  return "general";
}

// Function to get user's conversation history
function getUserConversationHistory(userId) {
  if (conversationMemory.has(userId)) {
    return conversationMemory.get(userId).conversationHistory || [];
  }
  return [];
}

// Function to update user's conversation history
function updateUserConversationHistory(userId, question, response) {
  const timestamp = new Date().toISOString();

  if (conversationMemory.has(userId)) {
    const userData = conversationMemory.get(userId);
    userData.conversationHistory = userData.conversationHistory || [];
    userData.conversationHistory.push(
      { role: "user", content: question, timestamp },
      { role: "assistant", content: response, timestamp }
    );

    // Keep only last 10 exchanges (20 messages) to prevent memory overload
    if (userData.conversationHistory.length > 20) {
      userData.conversationHistory = userData.conversationHistory.slice(-20);
    }

    conversationMemory.set(userId, userData);
  } else {
    conversationMemory.set(userId, {
      conversationHistory: [
        { role: "user", content: question, timestamp },
        { role: "assistant", content: response, timestamp },
      ],
    });
  }
}

// Function to clear user memory if needed
function clearUserMemory(userId) {
  if (conversationMemory.has(userId)) {
    conversationMemory.delete(userId);
  }
}

// Main chat function with conversation context
export const chat_with_ai_astro = async (
  question,
  astrologyType,
  userDetails,
  userName,
  data
) => {
  const userId = data?.userInfo?.userId || data?.senderId || "unknown";
  console.log({ question, astrologyType, userDetails, userName, data, userId });

  // Clear memory if this is a new user (optional, based on your requirements)
  if (userId !== "unknown" && !conversationMemory.has(userId)) {
    // This is a new user, ensure clean memory
    clearUserMemory(userId);
  }

  // Check if this is a personal information question
  if (isPersonalInfoQuestion(question)) {
    return handlePersonalInfoQuestion(question, data);
  }

  let birthChartData = null;
  const questionType = categorizeQuestion(question);
  const conversationHistory = getUserConversationHistory(userId);

  // Get planetary aspects data
  if (
    data &&
    data.userInfo &&
    data.userInfo.dob &&
    data.userInfo.lat &&
    data.userInfo.lon &&
    data.userInfo.tz
  ) {
    try {
      birthChartData = await getPlanetaryAspects(
        data.userInfo.dob,
        data.userInfo.tob || "05:30",
        data.userInfo.lat,
        data.userInfo.lon,
        data.userInfo.tz,
        "d8614618-eb19-5963-b5c4-16bbd5dc0401"
      );
    } catch (error) {
      console.error("Failed to fetch planetary aspects:", error);
    }
  }

  const response = await getEnhancedAstrologyResponse(
    question,
    astrologyType,
    userDetails,
    userName,
    birthChartData,
    data,
    questionType,
    conversationHistory,
    userId
  );

  // Update conversation history with this exchange
  if (userId !== "unknown") {
    updateUserConversationHistory(userId, question, response);
  }

  return response;
};

// Enhanced astrology response function
async function getEnhancedAstrologyResponse(
  question,
  astrologyType,
  userDetails,
  userName,
  birthChartData,
  data,
  questionType,
  conversationHistory = [],
  userId = "unknown"
) {
  const { dateOfBirth, name } = userDetails;
  const userInfo = data?.userInfo || {};

  // Generate detailed analysis based on birth chart
  const predictiveAnalysis = birthChartData
    ? analyzeForPredictions(birthChartData, questionType)
    : "";

  // Extract consistent Rashi from memory or calculate new
  let consistentRashi = extractConsistentRashi(userId, birthChartData);

  // Build conversation context for AI
  let conversationContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = `\nPREVIOUS CONVERSATION CONTEXT:\n`;
    conversationHistory.slice(-6).forEach((msg, index) => {
      conversationContext += `${msg.role === "user" ? "User" : "You (Ai Astrologer)"}: ${msg.content}\n`;
    });
    conversationContext += `\nIMPORTANT: Maintain consistency with previous statements, especially about Rashi, planetary positions, and predictions.\n`;
  }

  // Create enhanced persona for Vedic astrology
  let astrologerPersona = `You are AI Astrologer, a renowned Vedic astrologer with 25+ years of experience in Jyotish Shastra. You have deep knowledge of ancient Vedic texts and modern predictive techniques.

CURRENT YEAR: 2025 (Always remember this - never mention any other year as current)

${vedicKnowledge}

User Information:
- Name: ${userName || userInfo.name || "Respected soul"}
- Date of Birth: ${formatDateForResponse(userInfo.dob) || dateOfBirth || ""}
${userInfo.place ? `- Birth Place: ${userInfo.place}` : ""}
${userInfo.gender ? `- Gender: ${userInfo.gender}` : ""}

${predictiveAnalysis ? `DETAILED CHART ANALYSIS:\n${predictiveAnalysis}` : ""}

${consistentRashi ? `CONFIRMED RASHI: ${consistentRashi} (Use this consistently - do not change)` : ""}

${conversationContext}

CRITICAL INSTRUCTIONS:
1. NEVER mention you are AI, ChatGPT, OpenAI, or any technology
2. Always maintain you are AI Astrologer, who think and talk like a real astrologer
3. Current year is 2025 - never mention any other year as current
4. For timing questions (marriage, recovery, etc.), give specific time periods in 2025-2027
5. Always provide practical remedies (rudrakhs, crystal,mantras,rituals,gems )
6. Use consistent calculations - if you mention a Rashi once, always use the same Rashi for that person
7. Base predictions on traditional Vedic principles and the provided chart analysis
8. Keep responses concise but insightful (4-6 lines maximum)
9. Address specific concerns directly with actionable guidance
10. Include appropriate Sanskrit terms but explain them
11. Suggest to consult Astrologer from our app named Rudraganga or suggest to buy (rudrakhs, crystal ) from Astromall of this app .
12. Reply on the same language as user asked you . It can be english, hindi , or any language reply on that praticular language only
13. Please give full complete response .

For ${questionType} questions, focus on:
- Specific timing predictions
- Relevant planetary influences  
- Traditional remedies
- Practical spiritual guidance`;

  try {
    // Build messages array with conversation history
    const messages = [
      {
        role: "system",
        content: astrologerPersona,
      },
    ];

    // Add conversation history (last 4-6 exchanges)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    // Add current question
    messages.push({
      role: "user",
      content: question,
    });

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: messages,
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let aiResponse = response.data.choices[0].message.content;

    console.log("Enhanced AI Response:", aiResponse);

    return aiResponse;
  } catch (error) {
    console.error(
      "Error fetching AI response:",
      error?.response?.data || error.message
    );
    return "Due to planetary disturbances, I cannot provide reading at this moment. Please try again after some time with proper prayers.";
  }
}

// Helper functions
function isPersonalInfoQuestion(question) {
  const personalInfoKeywords = [
    "date of birth",
    "dob",
    "birth date",
    "when was i born",
    "what is my name",
    "my name",
    "who am i",
    "where was i born",
    "birth place",
    "place of birth",
    "what is my gender",
    "my gender",
    "am i male or female",
    "rashi",
    "moon sign",
    "janma rashi",
    "what year is it",
    "current year",
    "what time is it",
    "current date",
  ];

  const questionLower = question.toLowerCase();
  return personalInfoKeywords.some((keyword) =>
    questionLower.includes(keyword)
  );
}

function handlePersonalInfoQuestion(question, data) {
  const questionLower = question.toLowerCase();
  const userInfo = data?.userInfo || {};
  const currentYear = 2025;

  if (
    questionLower.includes("year") ||
    questionLower.includes("which year") ||
    questionLower.includes("current year")
  ) {
    return `The current year is ${currentYear}. How can I help you with your astrological questions for this year?`;
  }

  if (
    questionLower.includes("rashi") ||
    questionLower.includes("moon sign") ||
    questionLower.includes("janma rashi") ||
    questionLower.includes("rashi") ||
    questionLower.includes("sign")
  ) {
    // If we have chart data, calculate accurate rashi
    if (userInfo.moonLongitude) {
      const rashiData = calculateRashi(userInfo.moonLongitude);
      return `Your Janma Rashi (Moon Sign) is ${rashiData.rashi}. This remains consistent throughout your life and is calculated from your exact birth details.`;
    }
    return "To tell your accurate Janma Rashi, I need your complete birth details including date, time, and place of birth.";
  }

  if (
    questionLower.includes("date of birth") ||
    questionLower.includes("dob")
  ) {
    if (userInfo.dob) {
      return `According to your birth details, you were born on ${formatDateForResponse(userInfo.dob)}.`;
    }
    return "Please provide your complete birth details for accurate astrological analysis.";
  }

  return "I'd be happy to help with your astrological inquiry. Please feel free to ask your specific question.";
}

function formatDateForResponse(dateString) {
  if (!dateString) return "unknown";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

// Keep existing translation function
export const translateText = async (text, targetLanguage) => {
  if (!text || text.trim().length === 0) return text;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert translator. Translate to ${targetLanguage} while preserving:
            1. Vedic astrology terms (Rashi, Nakshatra, etc.)
            2. Cultural context and tone
            3. Current year as 2025
            4. Astrological predictions and remedies accurately
            
            Provide only the translation.`,
          },
          {
            role: "user",
            content: `Translate: ${text}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Translation failed:", error.message);
    return `${text} [Translation unavailable]`;
  }
};

// Export memory management functions for external use
export const memoryManager = {
  clearUserMemory,
  getUserMemory: (userId) => conversationMemory.get(userId),
  getAllUsers: () => Array.from(conversationMemory.keys()),
  getMemorySize: () => conversationMemory.size,
};
