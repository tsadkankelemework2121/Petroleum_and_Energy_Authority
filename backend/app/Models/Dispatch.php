<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dispatch extends Model
{
    protected $fillable = [
        'pea_dispatch_no',
        'oil_company_id',
        'transporter_id',
        'vehicle_id',
        'dispatch_datetime',
        'dispatch_location',
        'destination_depot_id',
        'eta_datetime',
        'drop_off_datetime',
        'fuel_type',
        'dispatched_liters',
        'status',
    ];

    public function depot()
    {
        return $this->belongsTo(Depot::class, 'destination_depot_id');
    }

    public function confirmation()
    {
        return $this->hasOne(DeliveryConfirmation::class);
    }
}
