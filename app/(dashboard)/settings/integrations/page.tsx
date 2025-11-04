'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  MessageSquare, 
  Shield, 
  ExternalLink, 
  Plus, 
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Info
} from 'lucide-react';

interface PhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  status: string;
  dateCreated: string;
}

interface TwilioAccount {
  sid: string;
  friendlyName: string;
  status: string;
  type: string;
  isTrial: boolean;
}

interface VerifiedContact {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  dateCreated: string;
}

interface AvailableNumber {
  phoneNumber: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
}

export default function IntegrationsPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [account, setAccount] = useState<TwilioAccount | null>(null);
  const [verifiedContacts, setVerifiedContacts] = useState<VerifiedContact[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [verifyPhoneNumber, setVerifyPhoneNumber] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Fetch phone numbers and account info
  useEffect(() => {
    fetchPhoneNumbers();
    fetchVerifiedContacts();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/twilio/phone-numbers');
      
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }
      
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
      setAccount(data.account);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifiedContacts = async () => {
    try {
      const response = await fetch('/api/integrations/twilio/verified-contacts');
      
      if (response.ok) {
        const data = await response.json();
        setVerifiedContacts(data.verifiedNumbers || []);
      }
    } catch (err) {
      console.error('Failed to fetch verified contacts:', err);
    }
  };

  const searchAvailableNumbers = async () => {
    if (!searchAreaCode) return;
    
    try {
      setSearchLoading(true);
      const response = await fetch(
        `/api/integrations/twilio/phone-numbers/available?areaCode=${searchAreaCode}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search available numbers');
      }
      
      const data = await response.json();
      setAvailableNumbers(data.availableNumbers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search numbers');
    } finally {
      setSearchLoading(false);
    }
  };

  const purchaseNumber = async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/integrations/twilio/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to purchase number');
      }
      
      // Refresh phone numbers list
      await fetchPhoneNumbers();
      setAvailableNumbers([]);
      setSearchAreaCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase number');
    }
  };

  const verifyPhoneContact = async () => {
    if (!verifyPhoneNumber) return;
    
    try {
      setVerifyLoading(true);
      const response = await fetch('/api/integrations/twilio/verified-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: verifyPhoneNumber }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate verification');
      }
      
      const data = await response.json();
      alert(`Verification call initiated to ${verifyPhoneNumber}. Please answer and enter the validation code: ${data.verificationRequest.validationCode}`);
      
      // Refresh verified contacts
      setTimeout(() => fetchVerifiedContacts(), 2000);
      setVerifyPhoneNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify phone number');
    } finally {
      setVerifyLoading(false);
    }
  };

  const getCapabilityBadges = (capabilities: PhoneNumber['capabilities']) => {
    const badges = [];
    if (capabilities.voice) {
      badges.push(
        <Badge key="voice" className="bg-purple-100 text-purple-900 border-purple-300 text-xs font-medium">
          Voice
        </Badge>
      );
    }
    if (capabilities.sms) {
      badges.push(
        <Badge key="sms" className="bg-blue-100 text-blue-900 border-blue-300 text-xs font-medium">
          SMS
        </Badge>
      );
    }
    if (capabilities.mms) {
      badges.push(
        <Badge key="mms" className="bg-green-100 text-green-900 border-green-300 text-xs font-medium">
          MMS
        </Badge>
      );
    }
    if (capabilities.fax) {
      badges.push(
        <Badge key="fax" className="bg-gray-100 text-gray-900 border-gray-300 text-xs font-medium">
          Fax
        </Badge>
      );
    }
    return badges;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Integrations</h1>
          <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">
            Manage your communication channels and phone numbers. Connect with customers across SMS, WhatsApp, and more.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-4xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Twilio Integration Section */}
        <Card className="shadow-lg border-0 max-w-6xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Twilio Integration</CardTitle>
                <CardDescription className="text-blue-100 mt-1">
                  Manage SMS, WhatsApp, and Voice communication through Twilio
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {account && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                    <Badge 
                      className={`px-3 py-1 text-sm font-medium ${
                        account.isTrial 
                          ? "bg-orange-100 text-orange-900 border-orange-300" 
                          : "bg-green-100 text-green-900 border-green-300"
                      }`}
                    >
                      {account.isTrial ? "Trial Account" : "Paid Account"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-500">Account Name</span>
                      <p className="text-base font-semibold text-gray-900">{account.friendlyName}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-500">Status</span>
                      <p className="text-base font-semibold text-gray-900 capitalize">{account.status}</p>
                    </div>
                  </div>
                  
                  {account.isTrial && (
                    <Alert className="mt-6 border-blue-300 bg-blue-100">
                      <Info className="h-4 w-4 text-blue-700" />
                      <AlertDescription className="text-blue-900">
                        <span className="font-medium">Trial Account:</span> You can send messages to verified phone numbers. 
                        To send to any number, 
                        <a 
                          href="https://console.twilio.com/billing" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-800 hover:text-blue-900 underline font-medium inline-flex items-center"
                        >
                          upgrade your account
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            <Tabs defaultValue="phone-numbers" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="phone-numbers" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                >
                  Phone Numbers
                </TabsTrigger>
                <TabsTrigger 
                  value="verified-contacts"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                >
                  Verified Contacts
                </TabsTrigger>
                <TabsTrigger 
                  value="purchase"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
                >
                  Purchase Numbers
                </TabsTrigger>
              </TabsList>

              {/* Phone Numbers Tab */}
              <TabsContent value="phone-numbers" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Your Phone Numbers</h3>
                  <Button onClick={fetchPhoneNumbers} variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {phoneNumbers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Phone className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No phone numbers found</h4>
                    <p className="text-gray-600">Purchase a number to start sending messages</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {phoneNumbers.map((number) => (
                      <Card key={number.sid} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                                <Phone className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-xl text-gray-900">{number.phoneNumber}</h4>
                                <p className="text-gray-600 text-sm mt-1">{number.friendlyName}</p>
                                <div className="flex space-x-2 mt-3">
                                  {getCapabilityBadges(number.capabilities)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <Badge 
                                className={`font-medium ${
                                  number.status === 'in-use' 
                                    ? 'bg-green-100 text-green-900 border-green-300' 
                                    : 'bg-gray-100 text-gray-900 border-gray-300'
                                }`}
                              >
                                {number.status === 'in-use' ? 'Active' : number.status}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                Added {new Date(number.dateCreated).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Verified Contacts Tab */}
              <TabsContent value="verified-contacts" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Verified Contacts</h3>
                  {account?.isTrial && (
                    <Badge className="bg-orange-100 text-orange-900 border-orange-300 font-medium">
                      Trial Account Only
                    </Badge>
                  )}
                </div>

                {account?.isTrial ? (
                  <div className="space-y-6">
                    <Alert className="border-blue-300 bg-blue-100">
                      <Info className="h-4 w-4 text-blue-700" />
                      <AlertDescription className="text-blue-900">
                        <span className="font-medium">Trial accounts</span> can only send messages to verified phone numbers. 
                        Add phone numbers below to verify them for testing.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">Add New Verified Number</h4>
                      <div className="flex space-x-3">
                        <div className="flex-1">
                          <Label htmlFor="verify-phone" className="text-sm font-medium text-gray-700">
                            Phone Number to Verify
                          </Label>
                          <Input
                            id="verify-phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={verifyPhoneNumber}
                            onChange={(e) => setVerifyPhoneNumber(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            onClick={verifyPhoneContact}
                            disabled={verifyLoading || !verifyPhoneNumber}
                          >
                            {verifyLoading ? (
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Verify
                          </Button>
                        </div>
                      </div>
                    </div>

                    {verifiedContacts.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Verified Numbers</h4>
                        <div className="grid gap-3">
                          {verifiedContacts.map((contact) => (
                            <Card key={contact.sid} className="border border-green-300 bg-green-100">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <CheckCircle className="h-5 w-5 text-green-700" />
                                    <div>
                                      <span className="font-medium text-green-900">{contact.phoneNumber}</span>
                                      <p className="text-sm text-green-800">{contact.friendlyName}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-green-800 font-medium">
                                    Verified {new Date(contact.dateCreated).toLocaleDateString()}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert className="border-green-300 bg-green-100">
                    <CheckCircle className="h-4 w-4 text-green-700" />
                    <AlertDescription className="text-green-900">
                      <span className="font-medium">Paid account:</span> You can send messages to any valid phone number. 
                      Verified contacts are only required for trial accounts.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Purchase Numbers Tab */}
              <TabsContent value="purchase" className="space-y-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900">Purchase Phone Numbers</h3>
                
                {account?.isTrial ? (
                  <Alert className="border-orange-300 bg-orange-100">
                    <AlertTriangle className="h-4 w-4 text-orange-700" />
                    <AlertDescription className="text-orange-900">
                      <span className="font-medium">Phone number purchase</span> is not available for trial accounts. 
                      Trial accounts use pre-assigned numbers only.
                      <a 
                        href="https://console.twilio.com/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 text-orange-800 hover:text-orange-900 underline font-medium inline-flex items-center"
                      >
                        Upgrade your account
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">Search Available Numbers</h4>
                      <div className="flex space-x-3">
                        <div className="flex-1">
                          <Label htmlFor="area-code" className="text-sm font-medium text-gray-700">
                            Area Code
                          </Label>
                          <Input
                            id="area-code"
                            type="text"
                            placeholder="e.g., 415, 212, 555"
                            value={searchAreaCode}
                            onChange={(e) => setSearchAreaCode(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            onClick={searchAvailableNumbers}
                            disabled={searchLoading || !searchAreaCode}
                          >
                            {searchLoading ? (
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            Search
                          </Button>
                        </div>
                      </div>
                    </div>

                    {availableNumbers.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Available Numbers</h4>
                        <div className="grid gap-3">
                          {availableNumbers.map((number) => (
                            <Card key={number.phoneNumber} className="border border-gray-200">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-lg">{number.phoneNumber}</span>
                                    <p className="text-gray-600 text-sm">
                                      {number.locality}, {number.region}
                                    </p>
                                    <div className="flex space-x-2 mt-2">
                                      {getCapabilityBadges(number.capabilities)}
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm"
                                    onClick={() => purchaseNumber(number.phoneNumber)}
                                  >
                                    Purchase
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}