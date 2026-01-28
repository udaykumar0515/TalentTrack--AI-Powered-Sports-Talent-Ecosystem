import React from 'react';
import { X, TrendingUp, AlertTriangle, Target, Activity, BarChart3, Clock, User, Award } from 'lucide-react';

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({ isOpen, onClose, session }) => {
  if (!isOpen || !session) return null;

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFormScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'elite': return 'text-purple-600 bg-purple-100';
      case 'advanced': return 'text-yellow-600 bg-yellow-100';
      case 'intermediate': return 'text-green-600 bg-green-100';
      case 'beginner': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Session Analysis Details
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {session.athleteName || 'Athlete'}
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  {session.exercise?.replace('_', ' ').toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(session.timestamp)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Reps</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{session.reps || 0}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Form Score</span>
              </div>
              <div className={`text-2xl font-bold ${getFormScoreColor(session.formScore || 0)}`}>
                {session.formScore || 0}%
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-900">Duration</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {session.durationSec ? `${session.durationSec.toFixed(1)}s` : '0s'}
              </div>
            </div>
          </div>

          {/* Form & Safety Analysis */}
          {session.cheatDetection && (
            <div className={`p-6 rounded-lg border-l-4 ${
              session.cheatDetection.riskLevel === 'high' 
                ? 'bg-red-50 border-red-400' 
                : session.cheatDetection.riskLevel === 'medium'
                ? 'bg-yellow-50 border-yellow-400'
                : 'bg-green-50 border-green-400'
            }`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${
                  session.cheatDetection.riskLevel === 'high' 
                    ? 'text-red-600' 
                    : session.cheatDetection.riskLevel === 'medium'
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`} />
                Form & Safety Analysis
              </h3>
              
              <div className="space-y-4">
                {/* Risk Level with Explanation */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Safety Level:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskLevelColor(session.cheatDetection.riskLevel)}`}>
                    {session.cheatDetection.riskLevel?.toUpperCase() || 'LOW'}
                  </span>
                </div>
                
                {/* Simple Explanation */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">What this means:</h4>
                  <p className="text-sm text-gray-600">
                    {session.cheatDetection.riskExplanation || (
                      session.cheatDetection.riskLevel === 'high' ? (
                        "⚠️ Your form needs attention. Focus on proper technique to avoid injury and get better results."
                      ) : session.cheatDetection.riskLevel === 'medium' ? (
                        "⚡ Good effort! Your form is mostly correct with room for improvement."
                      ) : (
                        "✅ Excellent form! You're performing the exercise safely and effectively."
                      )
                    )}
                  </p>
                </div>

                {/* Actionable Tips */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Tips for improvement:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {session.cheatDetection.riskLevel === 'high' ? (
                      <>
                        <li>• Slow down your movements for better control</li>
                        <li>• Focus on full range of motion</li>
                        <li>• Keep your core engaged throughout the exercise</li>
                        <li>• Consider reducing reps and focusing on quality</li>
                      </>
                    ) : session.cheatDetection.riskLevel === 'medium' ? (
                      <>
                        <li>• Maintain consistent speed throughout the exercise</li>
                        <li>• Focus on smooth, controlled movements</li>
                        <li>• Keep proper breathing rhythm</li>
                      </>
                    ) : (
                      <>
                        <li>• Keep up the great work!</li>
                        <li>• You can try increasing reps or adding variations</li>
                        <li>• Consider helping others with their form</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Benchmarking Section */}
          {session.benchmarking && (
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                How You're Doing
              </h3>
              
              <div className="space-y-4">
                {/* Performance Level */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Your Level:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPerformanceLevelColor(session.benchmarking.performance_level?.level)}`}>
                    {session.benchmarking.performance_level?.level?.toUpperCase() || 'BEGINNER'}
                  </span>
                </div>
                
                {/* Simple Performance Description */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Performance Summary:</h4>
                  <p className="text-sm text-gray-600">
                    {session.benchmarking.performance_level?.level === 'elite' ? (
                      "🏆 Elite performance! You're in the top tier of athletes. Keep pushing your limits!"
                    ) : session.benchmarking.performance_level?.level === 'advanced' ? (
                      "⭐ Advanced level! You're performing above average with strong technique."
                    ) : session.benchmarking.performance_level?.level === 'intermediate' ? (
                      "💪 Good progress! You're building solid fundamentals and improving steadily."
                    ) : (
                      "🌱 Beginner level! Focus on learning proper form and building consistency."
                    )}
                  </p>
                </div>

                {/* Peer Comparison */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Compared to others:</h4>
                  <p className="text-sm text-gray-600">
                    You're performing better than {session.benchmarking.peer_comparison?.percentile || 0}% of athletes doing this exercise.
                    {session.benchmarking.peer_comparison?.percentile >= 80 ? (
                      " That's excellent! 🎉"
                    ) : session.benchmarking.peer_comparison?.percentile >= 60 ? (
                      " That's great! 👍"
                    ) : session.benchmarking.peer_comparison?.percentile >= 40 ? (
                      " Keep working hard! 💪"
                    ) : (
                      " There's room to grow! 🌱"
                    )}
                  </p>
                </div>
              </div>

              {/* Performance Description */}
              {session.benchmarking.performance_level?.description && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Performance Description:</h4>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                    {session.benchmarking.performance_level.description}
                  </p>
                </div>
              )}

              {/* Improvement Suggestions */}
              {session.benchmarking.improvement_suggestions && session.benchmarking.improvement_suggestions.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Improvement Suggestions:</h4>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <ul className="space-y-1">
                      {session.benchmarking.improvement_suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Analysis Sections */}
          {session.form_analysis && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Form Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Rep Quality Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-600">Perfect Reps:</span>
                      <span className="font-semibold">{session.form_analysis.perfect_reps || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Good Reps:</span>
                      <span className="font-semibold">{session.form_analysis.good_reps || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Poor Reps:</span>
                      <span className="font-semibold">{session.form_analysis.poor_reps || 0}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Technique Breakdown</h4>
                  <div className="space-y-2">
                    {session.form_analysis.technique_breakdown && Object.entries(session.form_analysis.technique_breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-semibold">{Math.round(value as number)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {session.form_analysis.improvement_areas && session.form_analysis.improvement_areas.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Areas for Improvement</h4>
                  <div className="flex flex-wrap gap-2">
                    {session.form_analysis.improvement_areas.map((area: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Injury Risk Assessment */}
          {session.injury_risk_assessment && (
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Injury Risk Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Overall Risk Score</h4>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {session.injury_risk_assessment.overall_risk_score || 0}/100
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${session.injury_risk_assessment.overall_risk_score || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Risk Factors</h4>
                  {session.injury_risk_assessment.risk_factors && session.injury_risk_assessment.risk_factors.length > 0 ? (
                    <div className="space-y-2">
                      {session.injury_risk_assessment.risk_factors.map((factor: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(factor.risk_level)}`}>
                            {factor.risk_level}
                          </span>
                          <span className="text-sm">{factor.factor_name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-green-600 text-sm">No significant risk factors detected</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {session.performance_metrics && (
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Efficiency Score</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(session.performance_metrics.efficiency_score || 0)}%
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Power Output</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {session.performance_metrics.power_output ? `${session.performance_metrics.power_output}W` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {session.recommendations && session.recommendations.length > 0 && (
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-4">
                {session.recommendations.map((rec: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{rec.description}</p>
                    {rec.specific_actions && rec.specific_actions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Actions:</h5>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {rec.specific_actions.map((action: string, actionIndex: number) => (
                            <li key={actionIndex}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Metadata */}
          {session.session_metadata && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Session Type:</span>
                  <span className="ml-2 font-medium">{session.session_metadata.session_type || 'Practice'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Difficulty:</span>
                  <span className="ml-2 font-medium capitalize">{session.session_metadata.difficulty_level || 'Intermediate'}</span>
                </div>
                {session.session_metadata.goals && session.session_metadata.goals.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Goals:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {session.session_metadata.goals.map((goal: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailedAnalysisModal;
