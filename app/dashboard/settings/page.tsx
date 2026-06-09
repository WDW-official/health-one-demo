'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandMark } from '@/components/brand-mark';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [clinicName, setClinicName] = useState('Health One Dental Clinic');
  const [clinicPhone, setClinicPhone] = useState('(555) 123-4567');
  const [clinicEmail, setClinicEmail] = useState('info@healthone.com');
  const [clinicAddress, setClinicAddress] = useState('123 Dental Ave, Tooth City, TC 12345');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage clinic settings and configuration</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Settings saved successfully</span>
        </div>
      )}

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Information</CardTitle>
          <CardDescription>Basic clinic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Clinic Name</label>
            <Input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Clinic name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <Input
              type="tel"
              value={clinicPhone}
              onChange={(e) => setClinicPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <Input
              type="email"
              value={clinicEmail}
              onChange={(e) => setClinicEmail(e.target.value)}
              placeholder="info@clinic.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              placeholder="123 Main St, City, ST 12345"
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Application and system details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="text-sm text-gray-600">Application</p>
              <p className="font-medium">Health One Dental Management System</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="text-sm text-gray-600">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="text-sm text-gray-600">Database Type</p>
              <p className="font-medium">MongoDB</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="font-medium text-green-600">Operational</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage application data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Data Storage</p>
                <p className="text-sm text-yellow-800 mt-1">
                  All data is stored locally in your browser. Clear browser data or cache will result in data loss.
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full text-red-600 border-red-300 hover:bg-red-50">
            Export Data
          </Button>
          <Button variant="outline" className="w-full text-blue-600 border-blue-300 hover:bg-blue-50">
            Import Data
          </Button>
        </CardContent>
      </Card> */}

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <BrandMark className="h-14 w-14 border border-slate-100" />
            <p className="text-gray-700">
              Health One Dental Management System is a comprehensive patient management solution designed for dental clinics of all sizes.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Health One Dental. All rights reserved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
